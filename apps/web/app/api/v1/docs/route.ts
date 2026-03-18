import { NextResponse } from "next/server";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://neuroexpertise.ru";

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "НейроЭксперт Knowledge API",
    version: "1.0.0",
    description:
      "API для доступа к данным экспертов и экспертного контента платформы НейроЭксперт. " +
      "Используйте API-ключ для аутентификации.",
    contact: {
      email: "api@neuroexpertise.ru",
    },
  },
  servers: [{ url: `${APP_URL}/api/v1`, description: "Production" }],
  security: [{ BearerAuth: [] }, { ApiKeyQuery: [] }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        description: "API key as Bearer token: Authorization: Bearer ne_...",
      },
      ApiKeyQuery: {
        type: "apiKey" as const,
        in: "query" as const,
        name: "api_key",
        description: "API key as query parameter: ?api_key=ne_...",
      },
    },
    schemas: {
      Expert: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          full_name: { type: "string", example: "Иван Иванов" },
          slug: { type: "string", example: "ivan-ivanov-a1b2c3d4" },
          profile_url: {
            type: "string",
            example: `${APP_URL}/experts/ivan-ivanov`,
          },
          qualification: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          bio: { type: "string", nullable: true },
          trust_score: { type: "number", example: 42.5 },
          avg_rating: { type: "number", example: 4.8 },
          review_count: { type: "integer", example: 12 },
          years_experience: { type: "integer", nullable: true },
          is_verified: { type: "boolean" },
          knows_about: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          consultation_price: { type: "integer", nullable: true },
          article_count: { type: "integer" },
          niche: {
            type: "object",
            nullable: true,
            properties: {
              name: { type: "string" },
              slug: { type: "string" },
              icon: { type: "string" },
            },
          },
        },
      },
      Article: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          slug: { type: "string" },
          url: { type: "string" },
          meta_title: { type: "string", nullable: true },
          meta_description: { type: "string", nullable: true },
          keywords: { type: "string", nullable: true },
          word_count: { type: "integer" },
          published_at: { type: "string", format: "date-time" },
          faq: { type: "array", nullable: true },
          expert: {
            type: "object",
            nullable: true,
            properties: {
              full_name: { type: "string" },
              slug: { type: "string" },
              qualification: { type: "string", nullable: true },
            },
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          total: { type: "integer" },
          limit: { type: "integer" },
          offset: { type: "integer" },
          has_more: { type: "boolean" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          docs: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/experts": {
      get: {
        summary: "Список экспертов",
        description: "Возвращает список опубликованных экспертов с пагинацией.",
        parameters: [
          {
            name: "q",
            in: "query",
            description: "Поиск по имени или квалификации",
            schema: { type: "string" },
          },
          {
            name: "niche",
            in: "query",
            description: "Фильтр по slug ниши",
            schema: { type: "string" },
          },
          {
            name: "city",
            in: "query",
            description: "Фильтр по городу (частичное совпадение)",
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            description: "Количество результатов (макс. 100)",
            schema: { type: "integer", default: 20 },
          },
          {
            name: "offset",
            in: "query",
            description: "Смещение для пагинации",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Список экспертов",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Expert" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          "401": {
            description: "API key missing or invalid",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/articles": {
      get: {
        summary: "Список статей",
        description:
          "Возвращает список опубликованных экспертных статей с пагинацией.",
        parameters: [
          {
            name: "q",
            in: "query",
            description: "Поиск по заголовку или описанию",
            schema: { type: "string" },
          },
          {
            name: "expert",
            in: "query",
            description: "Фильтр по slug эксперта",
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            description: "Количество (макс. 100)",
            schema: { type: "integer", default: 20 },
          },
          {
            name: "offset",
            in: "query",
            description: "Смещение",
            schema: { type: "integer", default: 0 },
          },
        ],
        responses: {
          "200": {
            description: "Список статей",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Article" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          "401": {
            description: "API key missing or invalid",
          },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
