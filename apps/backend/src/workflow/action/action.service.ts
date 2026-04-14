import { Injectable, Logger } from '@nestjs/common';
import { NodeDto, NodeKind } from '../dto/workflow.dto';

@Injectable()
export class ActionService {
  private readonly logger = new Logger(ActionService.name);

  async execute(
    node: NodeDto,
    inputContext: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const kind = node.data?.kind as NodeKind | undefined;

    switch (kind) {
      case NodeKind.HTTP_REQUEST:
        return this.executeHttpRequest(node, inputContext);
      case NodeKind.DATA_TRANSFORM:
        return this.executeDataTransform(node, inputContext);
      default:
        this.logger.warn(
          `Unknown action kind "${kind ?? 'unset'}" on node ${node.id} — passing context through`,
        );
        return inputContext;
    }
  }

  private async executeHttpRequest(
    node: NodeDto,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = node.data?.url as string | undefined;
    const method = ((node.data?.method as string) ?? 'GET').toUpperCase();
    const headers = (node.data?.headers as Record<string, string>) ?? {};
    const body = node.data?.body as Record<string, unknown> | undefined;

    if (!url) {
      throw new Error(
        `HTTP request node ${node.id} is missing required field: url`,
      );
    }

    this.logger.log(`HTTP ${method} ${url} — node=${node.id}`);

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body:
        body !== undefined && method !== 'GET'
          ? JSON.stringify(body)
          : undefined,
    });

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text();
    }

    return {
      ...input,
      statusCode: response.status,
      responseBody,
      nodeId: node.id,
    };
  }

  private executeDataTransform(
    node: NodeDto,
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    const mapping = node.data?.mapping as Record<string, string> | undefined;

    if (!mapping || typeof mapping !== 'object') {
      this.logger.warn(
        `Data transform node ${node.id} has no mapping — returning input unchanged`,
      );
      return input;
    }

    this.logger.log(
      `Data transform: node=${node.id} keys=[${Object.keys(mapping).join(', ')}]`,
    );

    const transformed: Record<string, unknown> = {};
    for (const [outputKey, inputKey] of Object.entries(mapping)) {
      transformed[outputKey] = input[inputKey];
    }

    return { ...input, ...transformed, nodeId: node.id };
  }
}
