# SVG Extractor

Tách một file SVG lớn (ví dụ thiết kế xuất từ Canva) thành nhiều file SVG con, mỗi file là một đối tượng riêng (cổng hoa, cô dâu chú rể, nhẫn cưới…).

## Cách dùng

1. Mở file `svg-extractor.html` bằng Chrome hoặc Edge (nhấp đúp là được). Không cần cài đặt hay mạng internet.
2. Kéo thả một hoặc nhiều file `.svg` vào vùng giữa, hoặc bấm **Mở file SVG…**.
3. Phần mềm vẽ khung đánh số quanh từng SVG con tìm được. Bên phải là danh sách kết quả kèm ảnh xem trước, kích thước và dung lượng.
4. Tải về:
   - **Tải SVG** trên từng thẻ để tải từng file.
   - **Tải ZIP (file này)** để tải tất cả SVG con của file đang mở.
   - **Tải ZIP (tất cả file)** để tải mọi file đã mở, mỗi file một thư mục.

### Chỉnh tay khi kết quả tự động chưa đúng ý

Nhấp vào khung trên ảnh hoặc vào thẻ bên phải để chọn; nhấp tiếp vào mục khác để chọn thêm. Ví dụ, muốn gộp #3 và #4 thì nhấp vào khung số 3, nhấp vào khung số 4, rồi bấm **Gộp 2 mục đã chọn**.

| Nút | Tác dụng |
|---|---|
| **Gộp** | Gộp các mục đang chọn thành một SVG |
| **Tách nhỏ** | Tách mục đang chọn thành các phần nhỏ hơn |
| **Loại trừ / Khôi phục** | Mục bị loại trừ sẽ không có trong file ZIP. Nền trắng phủ cả trang mặc định bị loại trừ |

Chỉnh sửa của từng file được giữ lại khi chuyển qua lại giữa các file.

## Giảm dung lượng

Phần lớn dung lượng của file Canva là ảnh nhúng dạng PNG (base64). Mục **Giảm dung lượng** ở cột trái nén ngay khi xuất. Thẻ kết quả hiện dung lượng trước → sau (ví dụ `447.7 KB ~~6.2 MB~~ −93%`), phía trên danh sách có dòng tổng. Bản gốc không bị đổi, bạn có thể thử các mức rồi chọn.

| Mức | Ảnh | Đường vẽ | Kết quả trên file mẫu Canva |
|---|---|---|---|
| Tắt | giữ nguyên | giữ nguyên | 6.2 MB |
| Nhẹ | WebP chất lượng 95, tối đa 3× kích thước hiển thị | 3 chữ số thập phân | 1.3 MB (−79%) |
| **Cân bằng** (mặc định) | WebP chất lượng 85, tối đa 2× | 2 chữ số | 448 KB (−93%) |
| Mạnh | WebP chất lượng 70, tối đa 1× | 1 chữ số | 119 KB (−98%) |

Mỗi ô đều chỉnh được (chọn thì mức nén tự chuyển sang *Tùy chỉnh*). Phần mềm làm các việc sau:

- **Nén ảnh nhúng:** thu nhỏ ảnh về độ phân giải thực sự cần để hiển thị (tính theo tỉ lệ phóng thật của ảnh, kể cả ảnh nằm trong `mask`/`clipPath`/`<use>`) rồi mã hóa lại bằng WebP, JPEG hoặc PNG. Ảnh không bao giờ bị phóng to, và nếu bản mã hóa lại không nhỏ hơn thì giữ ảnh gốc. Ảnh có kênh trong suốt không bị chuyển sang JPEG, mà giữ PNG. Nếu không chắc kích thước hiển thị, ảnh chỉ được mã hóa lại chứ không thu nhỏ.
- **Dùng chung ảnh trùng lặp:** các `<image>` giống hệt nhau chỉ lưu một bản trong `<defs>`.
- **Làm tròn số:** mức làm tròn của `d`, `points`, `transform` và thông số hình tính theo tỉ lệ hiển thị thực của từng phần tử, nên sai số luôn dưới mức nhìn thấy được. Nội dung dùng tọa độ theo hộp bao (0–1) không bị làm tròn.
- **Dọn mã thừa:** xóa `<metadata>` (kể cả Content Credentials của Canva), chú thích, thuộc tính của phần mềm khác, `xmlns` không dùng, giá trị mặc định thừa và khoảng trắng giữa các thẻ.
- **ZIP luôn được nén** (deflate), kể cả khi tắt giảm dung lượng.

Lưu ý: WebP hiển thị tốt trong mọi trình duyệt hiện đại. Một số phần mềm đồ họa cũ (Illustrator đời cũ…) có thể không đọc được WebP; khi đó chọn định dạng **PNG** (hoặc **JPEG** nếu ảnh không trong suốt).

## Phần mềm tách như thế nào

1. **Đi theo cấu trúc file.** Phần mềm bỏ qua các lớp bọc (nhóm `<g>` chỉ có một con, khung cắt cả trang) để xuống tới cấp chứa nhiều đối tượng.
2. **Nhận diện đối tượng.**
   - Các phần tử dùng chung một khung `clip-path`/`mask` được gộp thành một đối tượng. Canva xuất mỗi đối tượng kèm khung cắt riêng, nên các trái tim rời của icon nhẫn vẫn nằm chung với chiếc nhẫn.
   - Nhóm `<g>`, ảnh, `<use>`, chữ và `<svg>` lồng được coi là đối tượng hoàn chỉnh. Hai đối tượng chồng lên nhau vẫn được giữ riêng.
   - Các mảnh path rời chồng lên nhau được gộp lại, và mỗi cụm mảnh chỉ được gắn vào một đối tượng.
   - Canva không giữ nhóm: một icon vector có thể bị xuất thành nhiều path, mỗi path một khung cắt riêng. Các mảnh vector đơn lẻ được gộp lại nếu hộp bao chồng lên nhau. Một mảnh nhỏ (trái tim, ngôi sao trang trí) nằm liền lớp và sát một icon lớn hơn nhiều cũng được gộp vào icon đó.
3. **Đo hộp bao bằng chính engine của trình duyệt.** Phép đo tính đủ `transform`, `clip-path`, `mask` và `<svg>` lồng có `viewBox`.
   - Hình có nét viền, bóng đổ (filter), hình xoay hoặc chữ được vẽ lại thành ảnh để đo phần thực sự có màu. Sau đó phần mềm phóng to sát từng cạnh, rồi "hít" vào biên hình học khi trùng khớp.
   - Nhờ vậy hộp bao không cắt mất nét nào và cũng không thừa lề.
4. **Xuất file.**
   - Mỗi SVG con giữ nguyên toàn bộ phần tử gốc, các nhóm cha, style, gradient, clip và mask, chỉ đổi `viewBox`. Hình ảnh vì thế giống bản gốc đến từng điểm ảnh.
   - Tài nguyên không dùng (ví dụ ảnh nhúng base64 của đối tượng khác) bị xóa khỏi `<defs>`, nên file con nhẹ.
   - Đơn vị kích thước gốc (px, mm, in…) được giữ đúng tỉ lệ.

## Tùy chọn

| Tùy chọn | Ý nghĩa |
|---|---|
| Gộp các phần tử chồng lên nhau | *Tự động*: chỉ gộp mảnh rời. *Luôn gộp*: gộp mọi thứ chồng nhau. *Không gộp*: chỉ theo cấu trúc file |
| Khoảng cách gộp mảnh rời | Các mảnh cách nhau không quá giá trị này (đơn vị SVG) được coi là một |
| Gộp phần tử dùng chung khung cắt | Nhận diện đối tượng kiểu Canva qua `clip-path`/`mask` |
| Gộp các mảnh vector sát nhau thành một icon | Ghép lại các path rời của cùng một icon. Ảnh và nhóm `<g>` không bị ảnh hưởng |
| Loại trừ nền phủ toàn trang | Phần tử phủ ≥ 90% trang bị coi là nền |
| Cắt theo khung trang gốc | Phần nằm ngoài trang gốc (vốn không hiển thị) không tính vào SVG con |
| Lề thêm | Thêm khoảng trống quanh mỗi SVG con |
| Xóa tài nguyên không dùng | Dọn `<defs>` cho file con nhỏ gọn |
| Đo viền/bóng chính xác theo điểm ảnh | Tắt đi thì dùng ước lượng hình học (nhanh hơn, có thể thừa lề với nét viền) |

## Giới hạn cần biết

- File **phẳng hoàn toàn** (mọi path nằm cùng một cấp, không nhóm, không khung cắt) không chứa thông tin nào cho biết các mảnh rời là của cùng một đối tượng. Ví dụ: trái tim tách rời khỏi chiếc nhẫn. Khi đó hãy tăng *Khoảng cách gộp*, hoặc chọn các mục rồi bấm **Gộp**.
- Thẻ `<script>` và thuộc tính sự kiện (`onclick`…) bị loại bỏ vì lý do an toàn.
- Ảnh tham chiếu file bên ngoài (`href="anh.png"`) được giữ nguyên đường dẫn, nên phải để ảnh cạnh file SVG con.

## Kiểm thử

```bash
node tests/make-fixtures.mjs     # sinh các file SVG mẫu vào tests/fixtures
node tests/run-tests.mjs         # kiểm thử tách, chạy trong Chrome headless, kết quả ở tests/out
node tests/run-optimizer-tests.mjs   # kiểm thử giảm dung lượng (dung lượng, độ lệch điểm ảnh, ZIP)
```

Script kiểm thử tách so khớp từng điểm ảnh giữa SVG con và vùng tương ứng của bản gốc. Hiện tại tất cả đều khớp 100%.
Script kiểm thử giảm dung lượng báo kích thước và độ lệch điểm ảnh của từng mức nén so với bản chưa nén, và báo lỗi nếu vượt ngưỡng (mức Nhẹ, Cân bằng, Mạnh lần lượt cho phép lệch trung bình 1.5, 3 và 8 trên thang 255).
Cả hai script đều nhận biến môi trường `SVGX_EXTRA="đường-dẫn-a.svg;đường-dẫn-b.svg"` để thử thêm file của bạn.
Nếu Chrome không nằm ở vị trí mặc định, truyền đường dẫn: `node tests/run-tests.mjs "C:/…/msedge.exe"`.
