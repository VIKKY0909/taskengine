import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize MongoDB connection in serverless / Vercel environments on the first request
let mongoInitPromise: Promise<void> | null = null;
app.use(async (req, res, next) => {
  if (!isConnected && MONGODB_URI) {
    if (!mongoInitPromise) {
      console.log('[Database] First request incoming. Lazy-initializing MongoDB connection...');
      mongoInitPromise = initMongo();
    }
    try {
      await mongoInitPromise;
    } catch (err) {
      console.error('[Database] Failed to await lazy-loaded MongoDB connection:', err);
    }
  }
  next();
});

// Database state
let mongoClient: MongoClient | null = null;
let isConnected = false;
let connectionError: string | null = null;

const MONGODB_URI = process.env.MONGODB_URI;

// Helper to get collection name and local DB path based on program/tenant parameter
function getProgramDetails(programParam?: any) {
  const paramLower = String(programParam || '').toLowerCase();
  let prog: 'kthp' | 'symconverge' | 'databook' = 'kthp';
  if (paramLower === 'symconverge') {
    prog = 'symconverge';
  } else if (paramLower === 'databook') {
    prog = 'databook';
  }

  let collectionName = 'tasks';
  let localPathName = 'tasks.json';

  if (prog === 'symconverge') {
    collectionName = 'symconverge_tasks';
    localPathName = 'symconverge_tasks.json';
  } else if (prog === 'databook') {
    collectionName = 'databook_tasks';
    localPathName = 'databook_tasks.json';
  }

  return {
    program: prog,
    collectionName,
    localPath: path.join(process.cwd(), 'data', localPathName)
  };
}

// Try multiple paths — Vercel serverless cwd differs from local dev
async function readLocalSeedFile(localPathName: string): Promise<any[] | null> {
  const candidates = [
    path.join(process.cwd(), 'data', localPathName),
    path.join(process.cwd(), '..', 'data', localPathName),
    path.join(fileURLToPath(new URL('.', import.meta.url)), 'data', localPathName),
    path.join(fileURLToPath(new URL('..', import.meta.url)), 'data', localPathName),
  ];

  for (const candidate of candidates) {
    try {
      const rawData = await fs.readFile(candidate, 'utf-8');
      return JSON.parse(rawData);
    } catch {
      // try next candidate
    }
  }
  return null;
}

// Initialize MongoDB Connection if URI is provided
async function initMongo() {
  if (!MONGODB_URI) {
    console.log('[Database] MONGODB_URI not found in env. Falling back to local storage.');
    return;
  }

  try {
    console.log('[Database] Attempting to connect to MongoDB Atlas...');
    mongoClient = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
    isConnected = true;
    connectionError = null;
    console.log('[Database] Successfully connected to MongoDB Atlas!');

    const db = mongoClient.db('kthp_seo');

    async function seedCollectionIfEmpty(collectionName: string, seedFileName: string, label: string) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      if (count > 0) return;

      console.log(`[Database] ${label} collection is empty. Seeding from ${seedFileName}...`);
      try {
        const defaultTasks = await readLocalSeedFile(seedFileName);
        if (!defaultTasks?.length) {
          console.error(`[Database] No seed data found for ${seedFileName}`);
          return;
        }
        const seededTasks = defaultTasks.map((t: any) => {
          const { _id, ...rest } = t;
          return rest;
        });
        await collection.insertMany(seededTasks);
        console.log(`[Database] Seeded ${seededTasks.length} ${label} tasks into MongoDB Atlas.`);
      } catch (seedErr) {
        console.error(`[Database] Seeding ${label} tasks failed:`, seedErr);
      }
    }

    await seedCollectionIfEmpty('tasks', 'tasks.json', 'KTHP');
    await seedCollectionIfEmpty('symconverge_tasks', 'symconverge_tasks.json', 'SymConverge');
    await seedCollectionIfEmpty('databook_tasks', 'databook_tasks.json', 'Databook');
  } catch (err: any) {
    mongoClient = null;
    isConnected = false;
    connectionError = err.message || String(err);
    console.error('[Database] Failed to connect to MongoDB Atlas. Fallback to local active. Error:', connectionError);
  }
}

// Read all tasks from the active database layer
async function readTasks(program?: string): Promise<any[]> {
  const { collectionName, localPath } = getProgramDetails(program);

  if (isConnected && mongoClient) {
    try {
      const db = mongoClient.db('kthp_seo');
      const collection = db.collection(collectionName);
      const docs = await collection.find({}).toArray();
      return docs.map(doc => ({
        ...doc,
        _id: doc._id.toString(),
      }));
    } catch (err) {
      console.error(`[Database] Error reading from MongoDB collection ${collectionName}, falling back to local file:`, err);
    }
  }

  // Local JSON File Fallback
  try {
    const fileName = path.basename(localPath);
    const tasks = (await readLocalSeedFile(fileName)) ?? [];
    if (tasks.length === 0) {
      console.error(`[Database] No local seed data found for ${fileName}`);
      return [];
    }
    let changed = false;
    const normalizedTasks = tasks.map((task: any, index: number) => {
      if (!task._id) {
        task._id = `local_task_${index}_${Math.random().toString(36).substring(2, 7)}`;
        changed = true;
      }
      return task;
    });
    if (changed) {
      try {
        await fs.writeFile(localPath, JSON.stringify(normalizedTasks, null, 2), 'utf-8');
      } catch {
        // read-only filesystem on Vercel — skip write
      }
    }
    return normalizedTasks;
  } catch (err) {
    console.error(`[Database] Failed to read local fallback ${localPath}:`, err);
    return [];
  }
}

// Write tasks to the active database layer
async function writeTask(task: any, program?: string): Promise<any> {
  const { collectionName, localPath } = getProgramDetails(program);

  if (isConnected && mongoClient) {
    try {
      const db = mongoClient.db('kthp_seo');
      const collection = db.collection(collectionName);
      const { _id, ...cleanTask } = task;

      if (_id && ObjectId.isValid(_id)) {
        await collection.updateOne({ _id: new ObjectId(_id) }, { $set: cleanTask });
        return { ...task, _id };
      } else {
        const result = await collection.insertOne(cleanTask);
        return { ...cleanTask, _id: result.insertedId.toString() };
      }
    } catch (err) {
      console.error(`[Database] MongoDB write failed for collection ${collectionName}, falling back to local file action:`, err);
    }
  }

  // Local JSON File Fallback
  try {
    const rawData = await fs.readFile(localPath, 'utf-8');
    const tasks = JSON.parse(rawData);

    if (task._id) {
      const index = tasks.findIndex((t: any) => t._id === task._id);
      if (index !== -1) {
        tasks[index] = task;
      } else {
        tasks.push(task);
      }
    } else {
      task._id = `local_task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      tasks.push(task);
    }

    await fs.writeFile(localPath, JSON.stringify(tasks, null, 2), 'utf-8');
    return task;
  } catch (err) {
    console.error(`[Database] Local fallback write failed for ${localPath}:`, err);
    throw err;
  }
}

// Delete a task
async function deleteTaskFromDb(id: string, program?: string): Promise<boolean> {
  const { collectionName, localPath } = getProgramDetails(program);

  if (isConnected && mongoClient) {
    try {
      const db = mongoClient.db('kthp_seo');
      const collection = db.collection(collectionName);
      if (ObjectId.isValid(id)) {
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount > 0;
      }
    } catch (err) {
      console.error(`[Database] MongoDB delete failed from ${collectionName}:`, err);
    }
  }

  // Local Fallback
  try {
    const rawData = await fs.readFile(localPath, 'utf-8');
    const tasks = JSON.parse(rawData);
    const index = tasks.findIndex((t: any) => t._id === id);
    if (index !== -1) {
      tasks.splice(index, 1);
      await fs.writeFile(localPath, JSON.stringify(tasks, null, 2), 'utf-8');
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[Database] Local fallback delete failed from ${localPath}:`, err);
    return false;
  }
}

// API Endpoints

// Ensure MongoDB is initialized before reporting status (important on Vercel cold starts)
async function ensureMongoReady() {
  if (!MONGODB_URI || isConnected) return;
  if (!mongoInitPromise) {
    mongoInitPromise = initMongo();
  }
  try {
    await mongoInitPromise;
  } catch {
    // connectionError is set inside initMongo
  }
}

// 1. Get database connection status
app.get('/api/db-status', async (req, res) => {
  try {
    await ensureMongoReady();
    res.json({
      isConnected,
      dbType: isConnected ? 'MongoDB Atlas' : 'Local JSON Fallback',
      connectionUriProvided: !!MONGODB_URI,
      connectionError: connectionError,
      uriMasked: MONGODB_URI ? MONGODB_URI.replace(/:([^@]+)@/, ':******@') : null
    });
  } catch (err: any) {
    res.status(500).json({
      isConnected: false,
      dbType: 'Error',
      connectionUriProvided: !!MONGODB_URI,
      connectionError: err.message || String(err),
      uriMasked: null
    });
  }
});

// 2. Fetch all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const program = req.query.program as string;
    const tasks = await readTasks(program);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve tasks', message: err.message });
  }
});

// 3. Create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const program = req.query.program as string;
    const { title, description, role, week, category, status, contributor, isOptional } = req.body;

    if (!title || !role || !week || !category || !status || !contributor) {
      return res.status(400).json({ error: 'Missing required task fields.' });
    }

    const timestamp = new Date().toISOString();
    const newTask = {
      title,
      description: description || '',
      role,
      week,
      category,
      status,
      isOptional: !!isOptional,
      contributor,
      history: [
        {
          date: timestamp,
          contributor,
          action: 'Created Task',
          details: `Task created by contributor ${contributor}.`
        }
      ],
      updatedAt: timestamp
    };

    const savedTask = await writeTask(newTask, program);
    res.status(201).json(savedTask);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create task', message: err.message });
  }
});

// 4. Update an existing task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const program = req.query.program as string;
    const { title, description, role, week, category, status, contributor, isOptional } = req.body;

    if (!contributor) {
      return res.status(400).json({ error: 'Contributor name ("f name") is required to perform updates.' });
    }

    const tasks = await readTasks(program);
    const currentTask = tasks.find((t: any) => t._id === id);

    if (!currentTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const timestamp = new Date().toISOString();
    const historyEntries = [...(currentTask.history || [])];

    const changes: string[] = [];
    if (status && status !== currentTask.status) {
      changes.push(`Status changed from "${currentTask.status}" to "${status}"`);
    }
    if (title && title !== currentTask.title) {
      changes.push(`Title changed from "${currentTask.title}" to "${title}"`);
    }
    if (description !== undefined && description !== currentTask.description) {
      changes.push('Description updated');
    }
    if (role && role !== currentTask.role) {
      changes.push(`Role changed from "${currentTask.role}" to "${role}"`);
    }
    if (week && week !== currentTask.week) {
      changes.push(`Timeline changed from "${currentTask.week}" to "${week}"`);
    }
    if (category && category !== currentTask.category) {
      changes.push(`Category changed from "${currentTask.category}" to "${category}"`);
    }

    if (changes.length > 0) {
      historyEntries.unshift({
        date: timestamp,
        contributor,
        action: 'Updated Task',
        details: `${changes.join(', ')} by ${contributor}.`
      });
    }

    const updatedTask = {
      ...currentTask,
      title: title || currentTask.title,
      description: description !== undefined ? description : currentTask.description,
      role: role || currentTask.role,
      week: week || currentTask.week,
      category: category || currentTask.category,
      status: status || currentTask.status,
      isOptional: isOptional !== undefined ? !!isOptional : currentTask.isOptional,
      contributor,
      history: historyEntries,
      updatedAt: timestamp
    };

    const savedTask = await writeTask(updatedTask, program);
    res.json(savedTask);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update task', message: err.message });
  }
});

// 5. Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const program = req.query.program as string;
    const success = await deleteTaskFromDb(id, program);
    if (success) {
      res.json({ message: 'Task deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Task not found.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete task', message: err.message });
  }
});

// 6. Overwrite MongoDB Atlas with local blueprint tasks
app.post('/api/db-sync', async (req, res) => {
  if (!isConnected || !mongoClient) {
    return res.status(400).json({ error: 'Database is not connected to MongoDB Atlas. Cannot perform cloud upload.' });
  }

  const program = req.query.program as string;

  try {
    const { collectionName, localPath } = getProgramDetails(program);

    const db = mongoClient.db('kthp_seo');
    const collection = db.collection(collectionName);

    const rawLocalData = await fs.readFile(localPath, 'utf-8');
    const defaultTasks = JSON.parse(rawLocalData);

    await collection.deleteMany({});

    const seededTasks = defaultTasks.map((t: any) => {
      const { _id, ...rest } = t;
      return rest;
    });

    let insertedCount = 0;
    if (seededTasks.length > 0) {
      const result = await collection.insertMany(seededTasks);
      insertedCount = result.insertedCount;
    }

    res.json({
      success: true,
      message: `Successfully uploaded and seeded ${insertedCount} tasks to MongoDB Atlas for program ${program || 'KTHP'}.`,
      count: insertedCount
    });
  } catch (err: any) {
    console.error(`[Database] Explicit seeding failed for ${program || 'KTHP'}:`, err);
    res.status(500).json({ error: 'Failed to upload tasks to MongoDB Atlas', message: err.message });
  }
});

// Start express server and hook Vite in development (not when imported by Vercel api/index.ts)
async function startServer() {
  await initMongo();

  const isDev = process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] KTHP Task Manager listening on http://0.0.0.0:${PORT}`);
    });
  }
}

function isDirectRun(): boolean {
  if (!process.argv[1]) return false;
  const entry = path.resolve(process.argv[1]);
  const self = fileURLToPath(import.meta.url);
  return path.resolve(self) === entry;
}

if (isDirectRun()) {
  startServer();
}

export default app;
