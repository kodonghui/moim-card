// The values mirror components.x-corthex.errors in api/openapi.yaml.
export const errorCatalog = {
  "invalid_request": {
    "status": 400,
    "title": "요청을 처리하지 못했어요. 다시 해 주세요"
  },
  "validation_failed": {
    "status": 400,
    "title": "칸 옆의 안내를 확인해 주세요"
  },
  "auth_code_invalid": {
    "status": 400,
    "title": "알림을 신청하지 못했어요"
  },
  "unauthenticated": {
    "status": 401,
    "title": "다시 확인이 필요해요"
  },
  "auth_failed": {
    "status": 401,
    "title": "확인하지 못했어요"
  },
  "origin_not_allowed": {
    "status": 403,
    "title": "지금은 쓸 수 없어요"
  },
  "not_participant": {
    "status": 403,
    "title": "이 방에 먼저 들어와 주세요"
  },
  "response_required": {
    "status": 403,
    "title": "답하면 볼 수 있어요"
  },
  "not_host": {
    "status": 403,
    "title": "방장만 마감할 수 있어요"
  },
  "identity_mismatch": {
    "status": 403,
    "title": "알림을 신청하지 못했어요"
  },
  "room_not_found": {
    "status": 404,
    "title": "이 방은 없거나 보관 기간이 지났어요"
  },
  "route_not_found": {
    "status": 404,
    "title": "요청을 처리하지 못했어요"
  },
  "method_not_allowed": {
    "status": 405,
    "title": "요청을 처리하지 못했어요"
  },
  "room_closed": {
    "status": 409,
    "title": "방이 그사이 마감됐어요"
  },
  "room_full": {
    "status": 409,
    "title": "이 방은 8명이 다 찼어요"
  },
  "already_submitted": {
    "status": 409,
    "title": "이미 답했어요"
  },
  "not_enough_responses": {
    "status": 409,
    "title": "2명 이상이 답해야 마감할 수 있어요"
  },
  "theme_unavailable": {
    "status": 409,
    "title": "이 테마는 지금 쓸 수 없어요"
  },
  "idempotency_conflict": {
    "status": 409,
    "title": "요청을 처리하지 못했어요. 다시 해 주세요"
  },
  "rate_limited": {
    "status": 429,
    "title": "잠시 뒤 다시 해 주세요"
  },
  "internal": {
    "status": 500,
    "title": "잠시 뒤 다시 해 주세요"
  },
  "toss_unavailable": {
    "status": 503,
    "title": "알림을 신청하지 못했어요"
  }
} as const;
export type ErrorCode = keyof typeof errorCatalog;
