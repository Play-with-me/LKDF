# 25 tướng Tam Quốc Sát và 40 kỹ năng

Tài liệu giúp rà điều kiện kích hoạt, chi phí, đối tượng hợp lệ và kết quả. Nguồn luật đầy đủ nằm ở [RULES_STANDARD.md](../RULES_STANDARD.md). Chỉ Chủ Công được dùng kỹ năng đánh dấu **Chủ Công**.

## Cách kỹ năng ảnh hưởng đến việc rút bài

- **Pha rút thường:** Bấm chồng bài một lần để nhận 2 lá. **Anh Tư** nhận 3 lá cùng lần bấm. Vòng 1 Hòa Bình vẫn bỏ qua pha rút thường.
- **Lỏa Y (thao tác dự kiến):** Hứa Chử bấm rút lá đầu, sau đó bấm chồng bài lần nữa để nhận lá thứ hai hoặc thực hiện hành động ra bài hợp lệ để chốt Lỏa Y. Bấm chọn mục tiêu để xem trước chưa chốt lựa chọn.
- **Đột Tập:** Người chơi chọn thay pha rút bằng lấy bài từ ghế hợp lệ. Nếu bỏ qua kỹ năng, bấm chồng bài để rút thường.
- **Tập Trí, Liên Doanh, Kiêu Cơ và Bế Nguyệt:** Tự rút đúng số lá khi điều kiện riêng đã xảy ra. **Lạc Thần** là chuỗi phán xét có thể dừng, còn **Quan Tinh** là xem và sắp bài, chưa đưa các lá đã xem vào tay.

## Thế lực THỤC (`7` Tướng)

1. **Lưu Bị (`4` máu · Nam · Chủ Công):**
   - **Nhân Đức** *(Chủ động · Pha Đánh):* Chọn `>= 1` lá **trên tay** giao vào tay `1` người chơi khác (không giới hạn số lần/lượt). Nếu tổng số lá bạn đã giao trong pha Đánh **lần đầu chạm mốc `>= 2`**, bạn hồi **`1` máu** (tối đa `1` lần/lượt).
   - **Kích Tướng** *(Chủ Công · Chủ động / Phản ứng):* Bất kỳ khi nào cần dùng hoặc đánh ra *Sát* (trong lượt đánh `PLAY` có mục tiêu, hoặc đáp trả *Quyết Đấu / Nam Man / Tá Đao*), có thể kêu gọi lần lượt các tướng **Thục khác** theo vòng ghế đánh ra `1 Sát` thay bạn (được tính như chính bạn dùng/đánh lá đó; khi Chủ Công dùng để đánh vào mục tiêu ở `PLAY`, vẫn tính `1` lần *Sát* trong lượt của Chủ Công).
2. **Quan Vũ (`4` máu · Nam):**
   - **Võ Thánh** *(Chuyển đổi):* Có thể dùng bất kỳ lá bài **màu Đỏ (`♥ / ♦`)** nào (**trên tay hoặc đang trang bị**) như lá `Sát` (vẫn là màu Đỏ).
3. **Trương Phi (`4` máu · Nam):**
   - **Phao Hống** *(Khóa):* Trong pha `PLAY`, dùng `Sát` **không giới hạn số lần**.
4. **Gia Cát Lượng (`3` máu · Nam):**
   - **Quan Tinh** *(Đầu lượt `TURN_START` — trước `JUDGE`):* Xem **`min(5, số người còn sống)`** lá trên đỉnh chồng bài rút; sắp xếp lại tùy ý số lượng đặt lên đỉnh (rút trước) và đặt xuống đáy chồng bài rút.
   - **Không Thành** *(Khóa):* Khi **`handCards.length === 0`**, không thể bị chọn làm mục tiêu của `Sát` hoặc `Quyết Đấu` (không miễn *Nam Man / Vạn Tiễn*, và không hủy được *Sát* nếu bị mất lá cuối sau khi đã bị chọn mục tiêu).
5. **Triệu Vân (`4` máu · Nam):**
   - **Long Đảm** *(Chuyển đổi):* Trên tay có `Sát` dùng/đánh được như `Thiểm`, và `Thiểm` dùng/đánh được như `Sát` (đặc biệt chỉ **bài trên tay**, không phải bài trang bị).
6. **Mã Siêu (`4` máu · Nam):**
   - **Mã Thuật** *(Khóa):* Khoảng cách từ bạn tới mọi người khác luôn `-1`.
   - **Thiết Kỵ** *(Khi đánh `Sát` chọn mục tiêu):* Lật `1` lá phán xét; nếu là **màu Đỏ (`♥ / ♦`)**, lá *Sát* này **không thể bị né bằng `Thiểm`** (chạy trước bước né của mục tiêu; vẫn bị *Nhân Vương Thuẫn* chặn nếu Sát là màu Đen!).
7. **Hoàng Nguyệt Anh (`3` máu · Nữ):**
   - **Tập Trí** *(Luật dự án đã duyệt):* Khi dùng **Cẩm nang thường hoặc Cẩm nang thời gian**, rút ngay **`1` lá**. Với Cẩm nang thường, rút ở thời điểm tuyên bố dùng, trước khi kiểm tra *Vô Giải*.
   - **Kỳ Tài** *(Khóa):* Sử dụng Cẩm nang **không bị giới hạn khoảng cách** (*Thuận Thủ Khiên Dương* chọn được bất kỳ ai).

## Thế lực NGỤY (`7` Tướng)

8. **Tào Tháo (`4` máu · Nam · Chủ Công):**
   - **Gian Hùng** *(Sau khi chịu sát thương):* Nếu nguồn gây sát thương là **lá bài** (hoặc nhiều lá như *Trượng Bát Xà Mâu*), lấy các lá đó về tay (không áp dụng cho sát thương từ kỹ năng không kèm bài như *Ly Gián/Phản Gián/Cương Liệt*). Nếu sống sót sau Thiểm Điện, có thể nhận lá Thiểm Điện vật lý.
   - **Hộ Giá** *(Chủ Công · Phản ứng):* Khi cần dùng hoặc đánh ra *Thiểm* (bị *Sát* hoặc *Vạn Tiễn*), hỏi lần lượt các tướng **Ngụy khác** theo vòng ghế đánh ra `1 Thiểm` giúp bạn (nếu gặp *Lữ Bố Vô Song*, hỏi đủ 2 lần).
9. **Tư Mã Ý (`3` máu · Nam):**
   - **Phản Quỷ** *(Sau khi chịu sát thương):* Nếu có `sourceSeat` (và `sourceSeat` có bài trên tay hoặc trang bị), được chọn `1` vị trí úp trên tay hoặc chọn `1` lá trang bị của nguồn sát thương về tay mình (**`1` lần/lượt sát thương**, bất kể `1` hay `2` máu).
   - **Quỷ Tài** *(Trước khi lá Phán xét có hiệu lực):* Đánh ra `1` lá bài **trên tay** để thay thế lá phán xét hiện tại (lá phán xét cũ vào chồng bài bỏ).
10. **Hạ Hầu Đôn (`4` máu · Nam):**
    - **Cương Liệt** *(Sau khi chịu sát thương có `sourceSeat` alive):* Lật `1` lá phán xét; nếu kết quả **KHÔNG phải chất Cơ (`♥`)**, nguồn sát thương buộc chọn: **bỏ `2` lá trên tay** HOẶC chịu **`1` sát thương** từ Hạ Hầu Đôn (**`1` lần/lần trúng đòn**; nếu nguồn có `< 2` lá trên tay thì bắt buộc chọn mất 1 máu).
11. **Trương Liêu (`4` máu · Nam):**
    - **Đột Tập** *(Pha `DRAW`):* Có quyền **bỏ qua việc rút `2` lá** từ chồng bài rút, thay bằng chọn `1` hoặc `2` người chơi khác đang có bài trên tay, lấy từ tay mỗi người đó **`1` lá úp**, giải quyết lần lượt theo trình tự dưới đây.
12. **Hứa Chử (`4` máu · Nam):**
    - **Lỏa Y** *(Pha rút):* Có thể rút **`1` lá thay vì `2` lá**. Nếu chọn rút `1` lá, cho tới hết lượt, sát thương do Hứa Chử gây ra bằng **`Sát`** hoặc **`Quyết Đấu`** tăng thêm **`1`**. Cách chọn bằng chồng bài được mô tả ở đầu tài liệu để bạn duyệt.
13. **Quách Gia (`3` máu · Nam):**
    - **Thiên Đố** *(Ngay sau khi lá Phán xét của bản thân có hiệu lực):* Thu lấy lá phán xét đó về tay (áp dụng cho cả *Lạc Bất Tư Thục, Thiểm Điện, Bát Quái Trận, Cương Liệt*).
    - **Di Kế** *(Sau khi chịu sát thương — tính theo TỪNG `1` điểm máu mất):* Mất `N` máu kích hoạt **`N` lần**; mỗi lần rút `2` lá từ chồng bài rút rồi tự giữ hoặc chia tùy ý từng lá vào tay những người còn sống.
14. **Chân Cơ (`3` máu · Nữ):**
    - **Lạc Thần** *(Đầu lượt `TURN_START` — trước `JUDGE`):* Liên tục lật lá phán xét; nếu ra **màu Đen (`♠ / ♣`)** thu ngay lá đó về tay và được lật tiếp; ra **màu Đỏ (`♥ / ♦`)** thì dừng (lá Đỏ bỏ xuống chồng bỏ) hoặc tự dừng bất cứ lúc nào.
    - **Khuynh Quốc** *(Chuyển đổi):* Có thể dùng bất kỳ lá **màu Đen (`♠ / ♣`) trên tay** như lá `Thiểm` (không dùng trang bị).

## Thế lực NGÔ (`8` Tướng)

15. **Tôn Quyền (`4` máu · Nam · Chủ Công):**
    - **Chế Hành** *(Chủ động · 1 lần/pha Đánh):* Bỏ `>= 1` lá bất kỳ (**trên tay hoặc đang trang bị**), sau đó **rút lại đúng bấy nhiêu lá** (bằng đúng số lá đã bỏ).
    - **Cứu Viện** *(Chủ Công · Khóa):* Khi một tướng **Ngô khác** dùng *Đào* cho bạn (khi hấp hối), bạn hồi **thêm `+1` máu** (tổng hồi `2` máu cho mỗi lá *Đào*).
16. **Cam Ninh (`4` máu · Nam):**
    - **Kỳ Tập** *(Chuyển đổi · Pha Đánh):* Có thể dùng bất kỳ lá **màu Đen (`♠ / ♣`)** nào (**trên tay hoặc trang bị**) như lá **Quá Hà Sái Cầu**.
17. **Lữ Mông (`4` máu · Nam):**
    - **Khắc Kỷ** *(Pha Bỏ bài `DISCARD`):* Nếu trong pha `PLAY` của lượt này bạn **không sử dụng hoặc đánh ra** bất kỳ lá `Sát` nào (kể cả qua kỹ năng hay *Tá Đao*), bạn được **bỏ qua Pha Bỏ Bài** (giữ nguyên toàn bộ bài trên tay).
18. **Hoàng Cái (`4` máu · Nam):**
    - **Khổ Nhục** *(Chủ động · Pha Đánh · Không giới hạn số lần):* Tự chịu mất `1` máu (`hp -= 1`, **không có nguồn gây sát thương**, tức phải tự chịu Hấp hối Cầu Đào trước khi rút bài nếu tụt xuống `0` máu!), nếu còn sống -> rút ngay **`2` lá**.
19. **Chu Du (`3` máu · Nam):**
    - **Anh Tư** *(Pha `DRAW`):* Được rút **thêm `1` lá** từ chồng bài rút (tổng **`3` lá**).
    - **Phản Gián** *(Chủ động · 1 lần/pha Đánh):* Chọn `1` người chơi khác (yêu cầu Chu Du có `>= 1` lá trên tay): mục tiêu chọn đoán `1` trong `4` chất (`♠ ♥ ♣ ♦`) rồi rút ngẫu nhiên `1` lá từ tay Chu Du và lật lên -> **nếu đoán sai chất, mục tiêu chịu `1` sát thương** từ Chu Du -> dù đoán đúng hay sai, **lá bài đó thuộc về tay mục tiêu**.
20. **Đại Kiều (`3` máu · Nữ):**
    - **Quốc Sắc** *(Chuyển đổi · Pha Đánh):* Có thể dùng bất kỳ lá **chất Rô (`♦`)** nào (**trên tay hoặc trang bị**) như **Lạc Bất Tư Thục**.
    - **Lưu Ly** *(Khi bị chọn làm mục tiêu của `Sát`):* Bỏ `1` lá bất kỳ (tay hoặc trang bị) để chuyển mục tiêu lá `Sát` này sang **1 người khác nằm trong tầm đánh của Đại Kiều** (không được chuyển ngược lại cho chính người vừa đánh `Sát`, và kiểm tra điều kiện *Không Thành*).
21. **Lục Tốn (`3` máu · Nam):**
    - **Khiêm Tốn** *(Khóa):* Không thể trở thành mục tiêu của **Thuận Thủ Khiên Dương** và **Lạc Bất Tư Thục**.
    - **Liên Doanh** *(Mất bài):* Bất kỳ khi nào mất lá bài cuối cùng trên tay (đánh ra, bỏ bài, giao bài hay bị cướp/hủy khiến `handCards` từ `>= 1` về `0`), rút ngay **`1` lá**. *(Nếu bỏ nhiều lá cùng một thao tác về `0`, chỉ tính `1` lần -> rút `1` lá).*
22. **Tôn Thượng Hương (`3` máu · Nữ):**
    - **Kết Hôn** *(Chủ động · 1 lần/pha Đánh):* Bỏ **`2` lá trên tay** và chọn `1` tướng **Nam đang bị thương (`hp < maxHp`)**: bạn và người đó mỗi người hồi `1` máu (**Tôn Thượng Hương đầy máu vẫn dùng được** để cứu đồng đội Nam, bản thân giữ nguyên `maxHp`).
    - **Kiêu Cơ** *(Mất trang bị):* Mỗi khi mất `1` lá trong khu Trang bị (bị cướp, bị hủy, tự lắp đè đồ mới hoặc bỏ trang bị), rút ngay **`2` lá**.

## Thế lực QUẦN (`3` Tướng)

23. **Hoa Đà (`3` máu · Nam):**
    - **Thanh Nang** *(Chủ động · 1 lần/pha Đánh):* Bỏ `1` lá **trên tay** để giúp `1` người chơi còn sống đang bị thương (kể cả chính mình) hồi `1` máu.
    - **Cấp Cứu** *(Chuyển đổi · Ngoài lượt):* Ngoài lượt của bản thân, có thể dùng bất kỳ lá **màu Đỏ (`♥ / ♦`)** nào (**trên tay hoặc đang trang bị**) như lá **Đào** (để cứu người hấp hối).
24. **Lữ Bố (`4` máu · Nam):**
    - **Vô Song** *(Khóa):*
      - Khi bạn đánh `Sát`: mục tiêu phải ra tổng cộng **`2` lá `Thiểm`** mới né được.
      - Khi bạn **sử dụng HOẶC là mục tiêu** của `Quyết Đấu`: đối phương phải đánh ra **`2` lá `Sát`** cho mỗi lần phản đòn trong ván đấu đó.
25. **Điêu Thuyền (`3` máu · Nữ):**
    - **Ly Gián** *(Chủ động · 1 lần/pha Đánh):* Bỏ `1` lá bất kỳ (tay hoặc trang bị) và chọn `2` tướng **Nam** khác nhau (`A` và `B`), buộc `A` coi như **sử dụng 1 lá `Quyết Đấu` lên `B`** (như vậy `B` đánh *Sát* trước, và **có thể bị `Vô Giải Khả Kích` vô hiệu hóa**).
    - **Bế Nguyệt** *(Kết thúc lượt `END`):* Rút ngay **`1` lá**.
