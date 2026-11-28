import React from 'react';
import { Button } from '@toss/tds-mobile';
import { navigate } from './routes';
const operator = import.meta.env.VITE_OPERATOR_NAME?.trim() || '운영자 확인 중';
const contact = import.meta.env.VITE_OPERATOR_CONTACT?.trim() || '연락처 확인 중';

export function Terms() {
  return <main className="create legal"><h1>이용약관</h1><p>변경일 2026년 11월 28일</p>
    <section><h2>서비스 안내</h2><p>모임 합의 카드는 모임에 필요한 선택을 함께 정하고 결과를 카드로 확인하는 서비스예요.</p></section>
    <section><h2>서비스 이용</h2><p>방을 만들거나 초대받아 문항에 답할 수 있어요. 방이 마감되면 최종 카드를 볼 수 있어요.</p></section>
    <section><h2>내 데이터</h2><p>내 데이터는 미니앱의 내 데이터 지우기 화면에서 지울 수 있어요. 자세한 내용은 개인정보처리방침에서 확인해 주세요.</p></section>
    <section><h2>운영자</h2><p>{operator}</p><p>{contact}</p></section>
  </main>;
}
export function Privacy() {
  return <main className="create legal"><h1>개인정보처리방침</h1><p>변경일 2026년 11월 28일</p>
    <section><h2>저장하는 것</h2><p>사용자 ID, 닉네임, 응답, 알림 신청과 신청 기간에 암호화해 둔 식별키, 지난 카드를 저장해요.</p></section>
    <section><h2>저장 위치</h2><p>데이터는 Cloudflare의 해외 리전에 저장해요.</p></section>
    <section><h2>보관 기간</h2><p>방과 방의 응답·닉네임은 방을 만든 날부터 30일이 지나면 지워요. 지난 카드 요약은 내 데이터를 지울 때까지 남아요. 알림 신청과 암호화한 식별키는 방이 마감되거나 만료되거나 내 데이터를 지우면 지워요.</p></section>
    <section><h2>앱 이용 통계</h2><p>앱 이용 통계를 토스에 보내며, 토스가 미니앱별 익명 키를 함께 기록해요</p></section>
    <section><h2>지우는 방법</h2><p>내 데이터 지우기에서 확인한 뒤 사용자 ID, 닉네임, 응답, 알림 신청과 지난 카드를 지울 수 있어요. 이미 확정된 최종 카드의 이름 없는 수는 남아요.</p></section>
    <section><h2>운영자</h2><p>{operator}</p><p>{contact}</p></section>
    <div className="create-action"><Button display="block" onClick={() => navigate('/me/delete')}>내 데이터 지우기로 가기</Button></div>
  </main>;
}
