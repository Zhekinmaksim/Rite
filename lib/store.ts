import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Redis } from '@upstash/redis'
import type { Workflow } from '@/lib/types'

const defaultPath = path.join(process.cwd(), 'data', 'workflows.json')
const storePath = process.env.WORKFLOW_STORE_PATH ? path.resolve(process.env.WORKFLOW_STORE_PATH) : defaultPath
const indexKey = 'rite:workflows'
const workflowKey = (id: string) => `rite:workflow:${id.toLowerCase()}`

let redis: Redis | null | undefined

function getRedis() {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL)
}

function missingProductionStoreError() {
  return new Error('Configure KV_REST_API_URL and KV_REST_API_TOKEN for Vercel workflow storage.')
}

async function readAll(): Promise<Workflow[]> {
  try {
    return JSON.parse(await readFile(storePath, 'utf8')) as Workflow[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function writeAll(workflows: Workflow[]) {
  await mkdir(path.dirname(storePath), { recursive: true })
  const tempPath = `${storePath}.${process.pid}.tmp`
  await writeFile(tempPath, JSON.stringify(workflows, null, 2), 'utf8')
  await rename(tempPath, storePath)
}

async function listRedis(redisClient: Redis): Promise<Workflow[]> {
  const ids = await redisClient.smembers<string[]>(indexKey)
  const workflows = await Promise.all(ids.map(id => redisClient.get<Workflow>(workflowKey(id))))
  return workflows.filter((workflow): workflow is Workflow => Boolean(workflow))
}

export const workflowStore = {
  async list() {
    const redisClient = getRedis()
    if (redisClient) return (await listRedis(redisClient)).sort((a, b) => b.createdAt - a.createdAt)
    if (isVercelRuntime()) return []
    return (await readAll()).sort((a, b) => b.createdAt - a.createdAt)
  },
  async get(id: string) {
    const redisClient = getRedis()
    if (redisClient) return await redisClient.get<Workflow>(workflowKey(id))
    if (isVercelRuntime()) return null
    return (await readAll()).find(workflow => workflow.id.toLowerCase() === id.toLowerCase()) ?? null
  },
  async create(workflow: Workflow) {
    const redisClient = getRedis()
    if (redisClient) {
      await redisClient.set(workflowKey(workflow.id), workflow)
      await redisClient.sadd(indexKey, workflow.id.toLowerCase())
      return workflow
    }
    if (isVercelRuntime()) throw missingProductionStoreError()
    const workflows = await readAll()
    workflows.push(workflow)
    await writeAll(workflows)
    return workflow
  }
}
