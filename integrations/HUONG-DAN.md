# Kết nối góp ý với Google Sheets

Sheet: https://docs.google.com/spreadsheets/d/1ONK0DZdlQOWWJeK-mU2VB2LcoSqchSZr06McTjz7hOc/edit

Tab `Mong muốn` có các cột: Thời gian (Việt Nam) · Ý kiến khách hàng · Mã phản hồi · Số điện thoại. Giữ nguyên thứ tự cột. Số điện thoại được ghi dạng văn bản để giữ số 0 đầu.

1. Mở Sheet → Tiện ích mở rộng → Apps Script.
2. Xóa code mẫu, dán toàn bộ nội dung file `merch-suggestions.gs`, bấm Lưu.
3. Mở Cài đặt dự án → Thuộc tính tập lệnh → Thêm thuộc tính:
   - Tên: `SUGGESTIONS_WEBHOOK_SECRET`
   - Giá trị: một chuỗi ngẫu nhiên mới dài ít nhất 32 ký tự. Lưu riêng chuỗi này; không dùng lại secret bình chọn `PHONE_HASH_SECRET`.
4. Bấm Triển khai → Lần triển khai mới → chọn loại Ứng dụng web.
   - Thực thi dưới tư cách: Tôi.
   - Ai có quyền truy cập: Bất kỳ ai (Anyone).
   - Cấp quyền truy cập Sheet cho script của bạn. Sao chép URL ứng dụng web kết thúc bằng `/exec`.
5. Cloudflare → Workers & Pages → `votemerchtuctac` → Settings → Variables and Secrets → Production. Thêm:
   - `SUGGESTIONS_WEBHOOK_URL`: URL `/exec` ở bước 4.
   - `SUGGESTIONS_WEBHOOK_SECRET`: đúng chuỗi ở bước 3 (loại Secret).
   Giữ nguyên `DB` và `PHONE_HASH_SECRET` đang dùng cho bình chọn.
6. Triển khai lại commit mới nhất trên nhánh `preview/merch-voting` để Functions nhận cấu hình.
7. Mở website, gửi một ý kiến kiểm tra. Chỉ khi Sheet xác nhận ghi được dữ liệu thì web mới báo thành công. Kiểm tra xuất hiện một hàng có nội dung và số điện thoại đúng.

Nếu sửa Apps Script về sau: Deploy → Manage deployments → Edit → New version → Deploy để giữ nguyên URL. Không chia sẻ secret trong chat hoặc đưa vào mã nguồn frontend.

Mã script có khóa chống ghi đồng thời và mã phản hồi để tránh ghi trùng khi gửi lại cùng yêu cầu. Chưa có OTP xác minh chủ sở hữu số điện thoại.
