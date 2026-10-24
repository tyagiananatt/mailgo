import { Client } from '@elastic/elasticsearch';
import prisma from '../db/prisma.js';

const nodeUrl = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
const indexName = process.env.ELASTICSEARCH_INDEX || 'emails';

export const esClient = new Client({
  node: nodeUrl,
  requestTimeout: 3000,
  maxRetries: 1,
});

let isEsConnected = false;

export async function initElasticsearch(): Promise<boolean> {
  try {
    const ping = await esClient.ping();
    if (ping) {
      isEsConnected = true;
      console.log(`🔍 Elasticsearch connected at ${nodeUrl}`);

      const indexExists = await esClient.indices.exists({ index: indexName });
      if (!indexExists) {
        await esClient.indices.create({
          index: indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                senderId: { type: 'keyword' },
                senderEmail: { type: 'keyword' },
                recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                recipientName: { type: 'text' },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`📁 Elasticsearch index '${indexName}' created successfully.`);
      }
      return true;
    }
  } catch (err: any) {
    isEsConnected = false;
    console.warn(`⚠️ Elasticsearch not reachable at ${nodeUrl} (${err.message}). Fallback to SQL full-text search is active.`);
  }
  return false;
}

export interface EmailDocument {
  id: string;
  senderId?: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  createdAt: Date | string;
}

export async function indexEmailInElastic(email: EmailDocument): Promise<void> {
  if (!isEsConnected) return;

  try {
    await esClient.index({
      index: indexName,
      id: email.id,
      body: {
        id: email.id,
        senderId: email.senderId,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail,
        recipientName: email.recipientName || '',
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: new Date(email.scheduledAt).toISOString(),
        sentAt: email.sentAt ? new Date(email.sentAt).toISOString() : null,
        createdAt: new Date(email.createdAt).toISOString(),
      },
    });
  } catch (err: any) {
    console.warn(`⚠️ Failed to index email ${email.id} to Elasticsearch:`, err.message);
  }
}

export async function updateEmailStatusInElastic(id: string, status: string, sentAt?: Date): Promise<void> {
  if (!isEsConnected) return;

  try {
    await esClient.update({
      index: indexName,
      id,
      body: {
        doc: {
          status,
          sentAt: sentAt ? sentAt.toISOString() : null,
        },
      },
    });
  } catch (err: any) {
    console.warn(`⚠️ Failed to update email ${id} status in Elasticsearch:`, err.message);
  }
}

export async function searchEmails(options: {
  query?: string;
  status?: string;
  senderEmail?: string;
  page?: number;
  limit?: number;
}) {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  // Try Elasticsearch search first if connected
  if (isEsConnected && options.query && options.query.trim().length > 0) {
    try {
      const mustClauses: any[] = [];
      const filterClauses: any[] = [];

      mustClauses.push({
        multi_match: {
          query: options.query,
          fields: ['subject^3', 'recipientEmail^2', 'recipientName^2', 'body'],
          fuzziness: 'AUTO',
        },
      });

      if (options.status) {
        filterClauses.push({ term: { status: options.status } });
      }

      if (options.senderEmail) {
        filterClauses.push({ term: { senderEmail: options.senderEmail } });
      }

      const response = await esClient.search({
        index: indexName,
        from: skip,
        size: limit,
        body: {
          query: {
            bool: {
              must: mustClauses,
              filter: filterClauses,
            },
          },
          sort: [{ scheduledAt: { order: 'desc' } }],
        },
      });

      const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;
      const ids = response.hits.hits.map((h: any) => h._id);

      // Fetch full relational records from DB preserving Elasticsearch relevance order
      const dbEmails = await prisma.email.findMany({
        where: { id: { in: ids } },
        include: { sender: true },
      });

      const emailMap = new Map(dbEmails.map((e) => [e.id, e]));
      const sortedEmails = ids.map((id) => emailMap.get(id)).filter(Boolean);

      return {
        emails: sortedEmails,
        total,
        page,
        limit,
        source: 'elasticsearch',
      };
    } catch (err: any) {
      console.warn('⚠️ Elasticsearch query failed, falling back to database query:', err.message);
    }
  }

  // Database Fallback Search
  const where: any = {};
  if (options.status) {
    where.status = options.status;
  }
  if (options.senderEmail) {
    where.senderEmail = options.senderEmail;
  }
  if (options.query && options.query.trim().length > 0) {
    where.OR = [
      { subject: { contains: options.query } },
      { recipientEmail: { contains: options.query } },
      { recipientName: { contains: options.query } },
      { body: { contains: options.query } },
    ];
  }

  const [total, emails] = await Promise.all([
    prisma.email.count({ where }),
    prisma.email.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: limit,
      include: { sender: true },
    }),
  ]);

  return {
    emails,
    total,
    page,
    limit,
    source: 'database',
  };
}
