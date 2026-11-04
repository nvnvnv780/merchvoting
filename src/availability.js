// 07:00 on 5 November 2026 in Vietnam = midnight UTC.
export const VOTING_RESUMES_AT = Date.parse('2026-11-05T00:00:00Z');
export const VOTING_PAUSE_MESSAGE = 'Hệ thống bình chọn xin được tạm dừng đến lúc 7:00 ngày 5/11';
export function unavailableMessage(now=Date.now()) {
 return now<VOTING_RESUMES_AT ? VOTING_PAUSE_MESSAGE : 'Hệ thống đang kết nối lại. Bạn vui lòng chờ một chút.';
}
export function availabilityRetryDelay(now=Date.now()) {
 return now<VOTING_RESUMES_AT ? VOTING_RESUMES_AT-now : 30000;
}
