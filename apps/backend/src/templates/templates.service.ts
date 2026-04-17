import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const SEED_TEMPLATES = [
  {
    name: '매일 아침 날씨 알림',
    description:
      '매일 오전 7시에 날씨 API를 조회하고 결과를 변환하는 자동화 워크플로우입니다.',
    category: '스케줄',
    dag: JSON.stringify({
      nodes: [
        {
          id: 'tpl1_n1',
          type: 'trigger',
          label: '매일 오전 7시',
          data: {
            nodeType: 'trigger',
            kind: 'schedule',
            config: { cron: '0 7 * * *' },
          },
        },
        {
          id: 'tpl1_n2',
          type: 'action',
          label: '날씨 API 조회',
          data: {
            nodeType: 'action',
            kind: 'http-request',
            config: {
              url: 'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true',
              method: 'GET',
            },
          },
        },
        {
          id: 'tpl1_n3',
          type: 'action',
          label: '결과 변환',
          data: {
            nodeType: 'action',
            kind: 'data-transform',
            config: {
              mapping: {
                temperature: 'current_weather.temperature',
                windspeed: 'current_weather.windspeed',
              },
            },
          },
        },
      ],
      edges: [
        { id: 'tpl1_e1', source: 'tpl1_n1', target: 'tpl1_n2' },
        { id: 'tpl1_e2', source: 'tpl1_n2', target: 'tpl1_n3' },
      ],
    }),
  },
  {
    name: '웹훅 받아서 디스코드 전송',
    description:
      '외부 시스템에서 웹훅을 수신하면 메시지를 가공하여 디스코드 채널로 전송합니다.',
    category: '알림',
    dag: JSON.stringify({
      nodes: [
        {
          id: 'tpl2_n1',
          type: 'trigger',
          label: '웹훅 수신',
          data: { nodeType: 'trigger', kind: 'webhook', config: {} },
        },
        {
          id: 'tpl2_n2',
          type: 'action',
          label: '메시지 구성',
          data: {
            nodeType: 'action',
            kind: 'data-transform',
            config: { mapping: { content: 'message' } },
          },
        },
        {
          id: 'tpl2_n3',
          type: 'action',
          label: '디스코드 전송',
          data: {
            nodeType: 'action',
            kind: 'http-request',
            config: {
              url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN',
              method: 'POST',
            },
          },
        },
      ],
      edges: [
        { id: 'tpl2_e1', source: 'tpl2_n1', target: 'tpl2_n2' },
        { id: 'tpl2_e2', source: 'tpl2_n2', target: 'tpl2_n3' },
      ],
    }),
  },
  {
    name: '조건부 Slack 알림',
    description:
      '이벤트 수신 후 상태 값을 조건으로 판단하여 오류일 때만 Slack에 알림을 보냅니다.',
    category: '알림',
    dag: JSON.stringify({
      nodes: [
        {
          id: 'tpl3_n1',
          type: 'trigger',
          label: '이벤트 수신',
          data: { nodeType: 'trigger', kind: 'webhook', config: {} },
        },
        {
          id: 'tpl3_n2',
          type: 'condition',
          label: '오류 여부 확인',
          data: {
            nodeType: 'condition',
            config: {
              leftOperand: 'status',
              operator: '==',
              rightOperand: 'error',
            },
          },
        },
        {
          id: 'tpl3_n3',
          type: 'action',
          label: 'Slack 알림 발송',
          data: {
            nodeType: 'action',
            kind: 'http-request',
            config: {
              url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
              method: 'POST',
            },
          },
        },
        {
          id: 'tpl3_n4',
          type: 'action',
          label: '정상 응답 처리',
          data: {
            nodeType: 'action',
            kind: 'data-transform',
            config: { mapping: { result: 'status' } },
          },
        },
      ],
      edges: [
        { id: 'tpl3_e1', source: 'tpl3_n1', target: 'tpl3_n2' },
        {
          id: 'tpl3_e2',
          source: 'tpl3_n2',
          target: 'tpl3_n3',
          sourceHandle: 'true',
        },
        {
          id: 'tpl3_e3',
          source: 'tpl3_n2',
          target: 'tpl3_n4',
          sourceHandle: 'false',
        },
      ],
    }),
  },
  {
    name: '배열 데이터 순차 처리',
    description:
      '웹훅으로 받은 배열 데이터를 항목별로 순회하며 외부 API를 호출하는 일괄 처리 워크플로우입니다.',
    category: '데이터 처리',
    dag: JSON.stringify({
      nodes: [
        {
          id: 'tpl4_n1',
          type: 'trigger',
          label: '데이터 수신',
          data: { nodeType: 'trigger', kind: 'webhook', config: {} },
        },
        {
          id: 'tpl4_n2',
          type: 'foreach',
          label: '항목 순회',
          data: {
            nodeType: 'foreach',
            config: { arrayField: 'items' },
          },
        },
        {
          id: 'tpl4_n3',
          type: 'action',
          label: '항목 처리',
          data: {
            nodeType: 'action',
            kind: 'http-request',
            config: {
              url: 'https://api.example.com/process',
              method: 'POST',
            },
          },
        },
      ],
      edges: [
        { id: 'tpl4_e1', source: 'tpl4_n1', target: 'tpl4_n2' },
        { id: 'tpl4_e2', source: 'tpl4_n2', target: 'tpl4_n3' },
      ],
    }),
  },
];

const CACHE_KEY = 'templates:all';
const CACHE_TTL = 300;

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    const count = await this.prisma.template.count();
    if (count === 0) {
      for (const tpl of SEED_TEMPLATES) {
        await this.prisma.template.create({ data: tpl });
      }
      await this.redis.del(CACHE_KEY);
    }
  }

  async findAll() {
    type TemplateRow = {
      id: string;
      name: string;
      description: string;
      category: string;
      createdAt: Date;
    };

    const cached = await this.redis.get<TemplateRow[]>(CACHE_KEY);
    if (cached) return cached;

    const rows = await this.prisma.template.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        createdAt: true,
      },
    });
    await this.redis.set(CACHE_KEY, rows, CACHE_TTL);
    return rows;
  }

  async use(id: string, userId: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) throw new NotFoundException(`Template ${id} not found`);

    return this.prisma.flow.create({
      data: {
        name: `${template.name} 사본`,
        dag: template.dag,
        userId,
      },
    });
  }
}
