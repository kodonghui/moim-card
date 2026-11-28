export async function listThemes(db: D1Database): Promise<Response> {
  const result = await db.prepare(`SELECT t.id AS themeId, t.name, MAX(q.version) AS questionSetVersion
    FROM themes t JOIN question_sets q ON q.theme_id=t.id AND q.status='published'
    GROUP BY t.id,t.name,t.sort_order ORDER BY t.sort_order LIMIT 20`).all<{themeId:string;name:string;questionSetVersion:number}>();
  return Response.json({themes:result.results});
}
