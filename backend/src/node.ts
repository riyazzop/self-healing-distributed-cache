import express, { Request, Response } from "express";

const app = express();

const PORT: string = process.argv[2];
const cache = new Map<string, any>();
const NODE: string = process.argv[3];

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
    res.send("Hello from Node 1!");
});

//Put key,value in cache
app.post('/put', async (req: Request, res: Response) => {
    const { key, value,type } = req.body as { key: string; value: unknown; type : "primary"|"replica" };

    if (!key) {
        return res.status(400).json({ error: "Request body must have at least one key" });
    }
    cache.set(String(key), {value,type});
    return res.json({ message: "Key , Value pair inserted successfully", key, value });
});

//Get value with key
app.get('/get/:key', async (req: Request, res: Response) => {
    const key = String(req.params.key);
    if (!cache.has(key)) {
        return res.status(200).json({data:null, message: `Key "${key}" not found in cache` ,success:false});
    }
    const entry = cache.get(key);
    return res.json({data:{key, value: entry.value}, message:"Successfully returning ...",success:true});
});

//Get all key,value pairs
app.get('/get-all', async (req: Request, res: Response) => {
    const type = req.query.type
    console.log(cache);
    const filtered =[...cache.entries()].filter(([key,val])=>val.type==type)
    return res.status(200).json(Object.fromEntries(filtered))
});

//Put all key,value pairs
app.post('/put-all', async (req: Request, res: Response) => {
    const { data } = req.body as { data: Record<string, unknown> };
    for (const [key, value] of Object.entries(data)) {
        cache.set(key, value);
    }
    return res.json({ message: "Copied successfully" });
});

//Delete key,value pair
app.delete('/delete/:key', (req: Request, res: Response) => {
    const key = String(req.params.key);
    const deleted = cache.delete(key);
    if (!deleted) {
        return res.status(200).json({ message: `Key : ${key} doesn't exist in cache`, success:false});
    }
    return res.json({ message: `Key : {${key}} and its value deleted successfully from cache`,success:true });
});

//health
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        keyCount: cache.size,
        upTime: process.uptime(),
        nodeId: NODE,
        memoryUsed: process.memoryUsage().heapUsed,
        timestamp: Date.now()
    });
});

//info
app.get('/info', (_req: Request, res: Response) => {
    res.json({
        nodeId: NODE,
        port: PORT,
        keyCount: cache.size,
        status: "alive"
    });
});

const server = app.listen(PORT, () => {
    console.log(`${NODE} is running on port ${PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
    console.error(`${NODE} failed to start on port ${PORT}: ${err.message}`);
    process.exit(1);
});

process.on("uncaughtException", (err) => {
    console.error(`${NODE} uncaught exception:`, err);
    process.exit(1);
});

