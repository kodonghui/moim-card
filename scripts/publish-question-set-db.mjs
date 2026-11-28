/** All rows for a new version commit together; uniqueness rejects republishing. */
export async function publish(db, payload, now = Math.floor(Date.now() / 1000)) {
  const {content: set, digest, themeName, sortOrder} = payload;
  const statements = [
    db.prepare('INSERT INTO themes (id,name,sort_order) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind(set.theme, themeName, sortOrder),
    db.prepare("INSERT INTO question_sets (theme_id,version,status,default_next_action,content_sha256,published_at) VALUES (?,?,'published',?,?,?)").bind(set.theme, set.version, set.default_next_action, digest, now),
  ];
  const getId = '(SELECT id FROM question_sets WHERE theme_id=? AND version=?)';
  for (const [index, q] of set.questions.entries()) {
    statements.push(db.prepare(`INSERT INTO questions (question_set_id,position,prompt,option_a,option_b,split_suggestion,agreed_text_a,agreed_text_b,axis,axis_pole_a) VALUES (${getId},?,?,?,?,?,?,?,?,?)`).bind(set.theme, set.version, index + 1, q.prompt, q.option_a, q.option_b, q.split_suggestion, q.agreed_text_a, q.agreed_text_b, q.axis ?? null, q.high_choice == null ? null : q.high_choice === 'A' ? 'high' : 'low'));
  }
  for (const [slot, phrase] of Object.entries(set.profile_phrases)) {
    statements.push(db.prepare(`INSERT INTO profile_phrases (question_set_id,slot,phrase) VALUES (${getId},?,?)`).bind(set.theme, set.version, slot, phrase));
  }
  await db.batch(statements);
}

