# RULES_STANDARD.md — Đặc Tả Luật Chơi & Kỹ Năng Bản Tiêu Chuẩn (Chuẩn Viết Code)

> **Dự án:** LKDF — Tam Quốc Sát (Bản Tiêu Chuẩn Gốc — Standard Edition)
> **Mục đích:** Tài liệu tham chiếu chuẩn hóa từ bộ luật chính thức **Yoka Games Tam Quốc Sát Bản Tiêu Chuẩn (`标准版`: 104 lá gốc + 4 lá EX = 108 lá & 25 Tướng chuẩn)** để lập trình viên / AI triển khai và kiểm chứng máy trạng thái luật chơi không sai lệch, không lẫn luật của các bản nâng cấp.
> **Đối chiếu mã nguồn:** [packages/shared/src](./packages/shared/src/index.ts) · **Cập nhật:** 2026-11-18

---

## 0. Ranh Giới Bắt Buộc: Chỉ Dùng Bản Chuẩn (KHÔNG Dùng Bản Nâng Cấp)

Hệ thống v1 chỉ sử dụng duy nhất **Tam Quốc Sát Bản Tiêu Chuẩn (`标准版` + 4 lá `EX`)**. Tuyệt đối **KHÔNG** trộn quy tắc của *Giới Hạn Đột Phá (`界限突破`)*, *Quân Tranh (`军争篇`)* hay *Phong Lâm Hỏa Sơn*:

| Thành phần | Bản Tiêu Chuẩn (ĐANG DÙNG) | Bản Nâng Cấp / Mở Rộng (CẤM DÙNG) |
| :--- | :--- | :--- |
| **Bộ bài** | **108 lá** (`104` chuẩn + `4` lá EX: *Vô Giải Q♦, Thiểm Điện A♠, Hàn Băng Kiếm 2♠, Nhân Vương Thuẫn 2♣*). Chỉ có **Sát thường** (không thuộc tính). | Không có *Tửu, Sát Hỏa, Sát Lôi, Thiết Tác Liên Hoàn, Đằng Giáp, Bạch Ngân Sư Tử, Cổ Đĩnh Đao, Chu Tước Vũ Phiến, Mộc Ngưu Lưu Mã*. |
| **Lưu Bị (*Nhân Đức*)** | Giao bao nhiêu lá tay tùy thích (`không giới hạn số lần/người`); đạt `>= 2` lá trong pha Đánh **hồi 1 máu** (tối đa 1 lần/lượt). | *(Giới Hạn)* Cấm giao 2 lần cho cùng 1 người; đổi thành coi như đánh 1 lá Cơ bản. |
| **Tào Tháo (*Gian Hùng*)** | Chỉ lấy lá bài gây sát thương cho mình. | *(Giới Hạn)* Rút thêm 1 lá. |
| **Tôn Quyền (*Chế Hành*)** | Bỏ `N` lá -> rút lại đúng `N` lá (1 lần/lượt). | *(Giới Hạn)* Nếu bỏ hết toàn bộ bài trên tay được rút `N + 1` lá. |
| **Tư Mã Ý (*Quỷ Tài* / *Phản Quỷ*)** | *Quỷ Tài* chỉ đánh lá **trên tay**; *Phản Quỷ* lấy `1` lá **mỗi lần** chịu sát thương (không phân biệt `1` hay `2` máu). | *(Giới Hạn)* *Quỷ Tài* được đánh cả trang bị; *Phản Quỷ* lấy theo từng `1 điểm` máu mất. |
| **Mã Siêu (*Thiết Kỵ*)** | Phán xét ra **màu Đỏ (`♥ / ♦`)** -> không thể né bằng *Thiểm*. | *(Giới Hạn)* Khóa kỹ năng không khóa của mục tiêu và bắt bỏ lá đồng chất. |
| **Hoàng Nguyệt Anh (*Kỳ Tài*)** | Dùng Cẩm nang **không giới hạn khoảng cách**. | *(Giới Hạn)* Thêm quyền giữ trang bị Giáp/Ngựa khi bỏ hoặc thêm giới hạn giữ bài. |
| **Đại Kiều (*Quốc Sắc*)** | Biến lá Rô (`♦`) thành *Lạc Bất Tư Thục* (không giới hạn lượt). | *(Giới Hạn)* Giới hạn 1 lần/lượt, thêm chức năng bỏ *Lạc* trên bàn và rút 1 lá. |
| **Hoàng Cái (*Khổ Nhục*)** | Tự mất 1 máu -> rút 2 lá (**không giới hạn số lần/lượt** miễn đủ máu/Đào). | *(Giới Hạn)* 1 lần/lượt, bỏ 1 lá mới mất 1 máu -> rút 3 lá & tăng tầm Sát. |
| **Lục Tốn (*Khiêm Tốn* / *Liên Doanh*)** | Miễn nhiễm *Thuận Thủ Khiên Dương* & *Lạc Bất Tư Thục*; mất lá tay cuối cùng rút `1` lá. | *(Giới Hạn)* Miễn bằng cách tạm giấu bài; chia bài *Liên Doanh*. |
| **Tôn Thượng Hương (*Kết Hôn*)** | Bỏ `2` lá **trên tay**, chọn `1` tướng nam bị thương -> cả 2 hồi `1` máu. | *(Giới Hạn)* Bỏ 1 lá tay hoặc gắn 1 trang bị lên người đó. |
| **Điêu Thuyền (*Bế Nguyệt*)** | Kết lượt rút **`1` lá**. | *(Giới Hạn)* Không còn bài trên tay thì rút `2` lá. |
| **Hứa Chử (*Lỏa Y*)** | Rút ít hơn `1` lá (từ `2` còn `1`) -> tăng `+1` sát thương *Sát* & *Quyết Đấu*. | *(Giới Hạn)* Lật 3 lá chọn lấy Vũ khí/Sát/Quyết Đấu mà không mất lượt rút. |
| **Lữ Mông (*Khắc Kỷ*)**, **Hoa Đà (*Thanh Nang*)** | *Khắc Kỷ* nếu pha Đánh chưa dùng/đánh *Sát*; *Thanh Nang* bỏ `1` lá tay hồi `1` máu (1 lần/lượt). | *(Bản 3v3/Giới Hạn)* Giới hạn hoặc thêm rút bài/phân bài khác. |

---

## 1. Sĩ Số, Chia Thân Phận, Điều Kiện Thắng & Chia Tướng Đầu Ván

### 1.1. Bảng phân bổ Thân Phận (`4–8` người chơi thật)

| Sĩ số | Chủ Công (`LORD`) | Trung Thần (`LOYALIST`) | Phản Tặc (`REBEL`) | Nội Gián (`SPY`) | Quy tắc đặc biệt |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **4** | 1 | 0 | 2 | 1 | Chủ Công lật công khai từ đầu, **`+1` máu tối đa** (`maxHp + 1`, `hp = maxHp`) & mở Kỹ năng Chủ Công. |
| **5** | 1 | 1 | 2 | 1 | nt |
| **6** | 1 | 1 | 3 | 1 | nt |
| **7** | 1 | 2 | 3 | 1 | nt |
| **8** | 1 | 2 | 3 | 2 | Có **2 Nội Gián** và **2 Nội Gián là đối thủ của nhau** (chỉ 1 người thắng). |

### 1.2. Điều kiện thắng (`evaluateWinCondition`) & Thưởng / Phạt kết liễu

Kiểm tra **ngay lập tức** tại thời điểm một nhân vật chết (TRƯỚC khi tính thưởng/phạt bài):

1. **Chủ Công & Trung Thần (`LORD_LOYALIST`) thắng:** Chủ Công còn sống VÀ toàn bộ Phản Tặc + Nội Gián đều đã chết (`alive Rebels == 0 && alive Spies == 0`).
2. **Nội Gián (`SPY`) thắng:** Chủ Công đã chết VÀ trên bàn **chỉ còn duy nhất đúng 1 người sống sót là Nội Gián** (`alivePlayers.length === 1 && alivePlayers[0].identity === 'SPY'`).
3. **Phản Tặc (`REBEL`) thắng:** Chủ Công đã chết trong **mọi trường hợp còn lại** (bao gồm trường hợp bàn 8 người khi Chủ Công chết mà vẫn còn Trung Thần hoặc còn 2 Nội Gián sống).

**Nếu ván CHƯA kết thúc sau cái chết (và người ra đòn `killerSeat !== null && killer.alive`):**
- **Giết Phản Tặc (`victim.identity === 'REBEL'`):** Bất kỳ ai (kể cả Chủ Công, Trung Thần, Phản Tặc khác hay Nội Gián) trực tiếp hạ sát Phản Tặc đều **rút ngay 3 lá bài**.
- **Chủ Công giết Trung Thần (`killer.identity === 'LORD' && victim.identity === 'LOYALIST'`):** Chủ Công phải **hủy toàn bộ bài trên tay và toàn bộ bài trong khu Trang bị** đưa vào chồng bài bỏ (giữ nguyên khu Phán xét).
- *Lưu ý:* Nếu nạn nhân chết do **Thiểm Điện** (Thiên tai, `killerSeat === null`), không ai nhận thưởng hoặc chịu phạt.

### 1.3. Quy trình chia 25 Tướng & Bài khởi đầu
1. Hệ thống rút ngẫu nhiên Thân Phận cho `4–8` ghế và lật công khai ghế **Chủ Công**.
2. **Bước chọn của Chủ Công (`1/5`):** Rút `2` tướng ngẫu nhiên từ `22` tướng thường, ghép cùng `3` tướng Chủ Công cố định (**Lưu Bị, Tào Tháo, Tôn Quyền**) thành **5 ứng viên** gửi riêng cho Chủ Công chọn `1`.
3. Trộn **4 tướng Chủ Công không chọn** trả lại vào chồng tướng còn lại (tổng đúng **24 tướng**).
4. **Bước chọn của các ghế khác (`1/3`):** Chia ngẫu nhiên **3 tướng/người** cho `3–7` người còn lại (`tối đa 7 × 3 = 21 <= 24`). Mọi người chọn bí mật đồng thời, xong mới **lật công khai toàn bàn cùng lúc**. (Chủ Công nhận `baseMaxHp + 1`).
5. **Chia bài khởi đầu:** Chia **4 lá bài** cho mỗi người từ chồng `108` lá đã trộn.
6. **Chủ Công luôn là người đi Lượt 1 ở Vòng 1** (và ngay lượt đầu tiên vẫn rút 2 lá bình thường).

---

## 2. Máy Trạng Thái Vòng Lượt & Quy Tắc Cứng Toàn Bàn

> **Quy ước hướng vòng ghế (Important Note cho Dev):** Trong sách luật giấy tiếng Trung của Yoka Games, chiều ngồi chuẩn gọi là *ngược chiều kim đồng hồ (`逆时针`)*. Trong ứng dụng Windows LKDF, người chơi ngồi **theo chiều kim đồng hồ (`seatIndex` tăng dần)**. Về mặt toán học máy trạng thái, chỉ cần **4 cơ chế sau đi theo CÙNG 1 chiều vòng ghế** là 100% đúng luật:
> 1. Thứ tự xoay lượt (`advanceToNextTurn`)
> 2. Thứ tự hỏi *Cầu Đào* khi hấp hối
> 3. Thứ tự xét bài diện rộng (*Nam Man, Vạn Tiễn, Đào Viên, Ngũ Cốc*) & kỹ năng Chủ Công (*Kích Tướng, Hộ Giá*)
> 4. Vòng tính khoảng cách (`calculateSeatDistance`)

### 2.1. Chuỗi 6 Pha cứng trong MỖI lượt (`stepEngine`)

Mọi lượt của mọi người chơi đều đi tuần tự đúng 6 pha sau:

1. **Pha Chuẩn Bị Đầu Lượt (`TURN_START`, chạy trước Phán xét):**
   - Kích hoạt các kỹ năng đầu lượt theo thứ tự: *Quan Tinh* (Gia Cát Lượng), *Lạc Thần* (Chân Cơ).
2. **Pha Phán Xét (`JUDGE`):**
   - Nếu trong khu phán xét (`delayedScrolls`) có bài:
     - Xét theo nguyên tắc **Vào sau – Xét trước (`LIFO`)** (lá mới đặt sau cùng lên đầu xét trước).
     - Trước khi lật lá phán xét của từng lá Cẩm nang thời gian, luôn mở cửa sổ **hỏi `Vô Giải Khả Kích` toàn bàn**. Nếu bị *Vô Giải*, hủy hiệu lực lá Cẩm nang đó ngay và bỏ vào chồng bài bỏ (riêng *Thiểm Điện* bị *Vô Giải* không biến mất mà **chuyển sang khu phán xét của người sống kế tiếp**!).
     - Nếu không bị *Vô Giải*, lật 1 lá đỉnh chồng rút -> mở cửa sổ *Quỷ Tài* (`Tư Mã Ý`) nếu có -> chốt kết quả -> mở *Thiên Đố* (`Quách Gia`) nếu lá phán xét thuộc về Quách Gia -> bỏ lá phán xét vào chồng bài bỏ (nếu Quách Gia không lấy).
   - Xét hết khu phán xét mới sang pha Rút bài.
3. **Pha Rút Bài (`DRAW`):**
   - Mặc định rút **`2` lá** từ đỉnh chồng bài rút.
   - Kỹ năng tác động tại đây: *Đột Tập* (Trương Liêu — bỏ qua rút bài từ chồng để bốc), *Lỏa Y* (Hứa Chử — rút ít hơn `1` lá), *Anh Tư* (Chu Du — rút thêm `1` lá, tổng `3`).
   - **Quy tắc cạn chồng bài rút:** Bất kỳ lúc nào cần lật hoặc rút bài mà `drawPile.length === 0`, lập tức lấy toàn bộ `discardPile` xáo trộn ngẫu nhiên làm `drawPile` mới (nếu cả hai đều `0` thì ngừng rút).
4. **Pha Đánh Bài (`PLAY`):**
   - *(Nếu trước đó bị dính Lạc Bất Tư Thục phán xét khác ♥, bỏ qua toàn bộ Pha Đánh Bài nhảy thẳng sang Pha Bỏ Bài).*
   - Có thể thực hiện `0` hoặc nhiều hành động hợp lệ tùy ý:
     - **Sát (`sat`):** Mặc định tối đa **`1` lần / lượt Đánh** (trừ khi cầm *Gia Cát Liên Nỗ* hoặc là *Trương Phi - Phao Hống*).
     - **Đào (`dao`):** Tự hồi `1` máu cho bản thân; **chỉ được dùng khi `hp < maxHp`** (đầy máu không được tự ăn Đào).
     - **Trang bị:** Không giới hạn số lần lắp. Mỗi ghế có tối đa 4 ô (`1 Vũ khí, 1 Giáp, 1 Ngựa +1, 1 Ngựa -1`). Lắp món mới vào ô đã có đồ sẽ tự **đưa món cũ vào chồng bài bỏ** (kích hoạt *Kiêu Cơ* nếu là Tôn Thượng Hương).
     - **Cẩm nang thường:** Không giới hạn số lần dùng nếu thỏa điều kiện.
     - **Cẩm nang thời gian:** Không thể đặt `Lạc Bất Tư Thục` lên bản thân; mỗi người chỉ được chứa **tối đa 1 lá `Lạc Bất Tư Thục`** và **tối đa 1 lá `Thiểm Điện`** cùng lúc trước mặt.
     - **Kỹ năng chủ động pha Đánh:** Chế Hành (1/lượt), Nhân Đức, Kích Tướng, Phản Gián (1/lượt), Kết Hôn (1/lượt), Thanh Nang (1/lượt), Ly Gián (1/lượt), Khổ Nhục (không giới hạn).
5. **Pha Bỏ Bài (`DISCARD`):**
   - **Giới hạn bài trên tay = `Math.max(0, hp)`** (máu hiện tại).
   - Nếu `handCards.length > limit`: kiểm tra *Khắc Kỷ* (`Lữ Mông` — nếu trong pha Đánh không sử dụng/đánh ra `Sát`, được chọn bỏ qua pha Bỏ bài); ngược lại buộc bỏ đúng `handCards.length - limit` lá vào chồng bài bỏ.
6. **Pha Kết Thúc Lượt (`END`):**
   - Kích hoạt kỹ năng kết thúc (*Bế Nguyệt* của Điêu Thuyền rút `1` lá).
   - Xóa toàn bộ cờ trạng thái trong lượt (`satUsedThisTurn`, *Lỏa Y*, cờ giới hạn 1/lượt), chuyển sang ghế còn sống kế tiếp (tăng `roundNumber` khi quay hết vòng bàn).

### 2.2. Công thức Khoảng Cách & Tầm Đánh (`distance`)
- **Khoảng cách ghế thuần (`seatDistance`):** Chỉ đếm **người còn sống** theo đường vòng ngắn nhất:
  `min((toIdx - fromIdx + N) % N, (fromIdx - toIdx + N) % N)` (với `N` là số người còn sống; người đã chết rút khỏi vòng tính).
- **Khoảng cách thực tế (`distance`):**
  `distance(A -> B) = max(1, seatDistance(A, B) + (B có Ngựa +1 ? 1 : 0) - (A có Ngựa -1 ? 1 : 0) - (A là Mã Siêu ? 1 : 0))`
  *(Khoảng cách giữa 2 người khác nhau tối thiểu luôn bằng `1`)*.
- **Tầm đánh (`attackRange`):** Mặc định là **`1`** nếu không cầm Vũ khí; nếu cầm Vũ khí thì bằng tầm đánh của Vũ khí (`1..5`).
- Hợp lệ đánh `Sát`: `distance(A -> B) <= attackRange(A)`.
- Hợp lệ *Thuận Thủ Khiên Dương*: `distance(A -> B) <= 1` (trừ *Hoàng Nguyệt Anh - Kỳ Tài*: không giới hạn khoảng cách Cẩm nang).

### 2.3. Thứ Tự Giải Quyết Chuỗi Sát – Sát Thương – Cầu Đào – Phản Đòn (Timing Tree)

Khi giải quyết 1 lá **Sát** (hoặc nguồn sát thương bất kỳ):
1. **Tuyên bố mục tiêu (`Target Selected`):** Kiểm tra *Không Thành* (Gia Cát). Sau khi xác nhận mục tiêu hợp lệ -> hỏi **Đại Kiều (`Lưu Ly`)** ở mục tiêu (nếu chuyển mục tiêu thì mục tiêu mới kiểm tra lại bước này) -> hỏi **Từ Hùng Song Cổ Kiếm** (khác giới) -> hỏi **Mã Siêu (`Thiết Kỵ`)**.
2. **Phản ứng né (`Dodge`):** Nếu chưa bị *Thiết Kỵ* khóa né:
   - Nếu không bị *Thanh Công Kiếm* bỏ giáp và cầm **Nhân Vương Thuẫn** gặp **Sát Đen** -> **Sát vô hiệu ngay**.
   - Ngược lại, tính số `Thiểm` cần ra (`2` nếu người đánh là **Lữ Bố - Vô Song**, mặc định `1`).
   - Mục tiêu được lần lượt dùng **Bát Quái Trận** (nếu không bị *Thanh Công Kiếm*, có thể phán xét tối đa bằng số Thiểm còn thiếu), **Hộ Giá** (nếu là Chủ Công Tào Tháo), **Khuynh Quốc** (Chân Cơ), **Long Đảm** (Triệu Vân), hoặc đánh **Thiểm** từ tay.
   - **Chỉ khi đủ số lượng `Thiểm` mới né thành công!** (Ví dụ gặp Lữ Bố mà chỉ có 1 Thiểm vẫn mất 1 Thiểm đó và vẫn trúng đòn!).
   - Nếu né thành công: kiểm tra **Quán Thạch Phủ** (bỏ 2 lá ép trúng) hoặc **Thanh Long Yển Nguyệt Đao** (đánh tiếp 1 Sát khác vào cùng mục tiêu).
3. **Trước khi gây sát thương (`Before Damage`):** Nếu do `Sát` và có **Hàn Băng Kiếm** (vũ khí) + nạn nhân có bài (tay hoặc trang bị) -> có quyền **ngăn sát thương** để hủy tối đa 2 lá của nạn nhân (vì sát thương bị ngăn nên **KHÔNG** kích hoạt *Gian Hùng, Phản Quỷ, Cương Liệt, Di Kế*!).
4. **Gây sát thương & Trừ máu (`Apply Damage`):**
   - Trừ `amount` máu (`1`, hoặc `2` nếu có *Lỏa Y*, `3` nếu *Thiểm Điện*).
   - Nếu là sát thương từ `Sát` và còn sống (hoặc sau trừ máu): kích hoạt **Kỳ Lân Cung** (hủy 1 lá Ngựa `+1/-1` của nạn nhân).
5. **Hấp Hối & Cầu Đào (`WAIT_PEACH_RESCUE` — Bắt buộc giải quyết TRƯỚC phản đòn!):**
   - Nếu `target.hp <= 0`: ngay lập tức mở vòng **Cầu Đào** đi lần lượt từng người **từ `currentTurnSeat` theo chiều vòng ghế** (mỗi người chỉ được hỏi 1 lượt trong pha hấp hối này; người hấp hối chỉ tự dùng `Đào`, người khác dùng `Đào` — hoặc **Hoa Đà - Cấp Cứu** ngoài lượt dùng lá Đỏ — cho đến khi `hp >= 1`, hoặc tất cả bỏ qua -> tử trận).
   - **Cứu Viện (Tôn Quyền Chủ Công):** Nếu người Ngô khác dùng `Đào` cứu Tôn Quyền, hồi **`2` máu** thay vì `1`.
   - Nếu không cứu lên `>= 1`: nhân vật **chết ngay**, lật Thân Phận, vứt sạch bài, kiểm tra thắng/thua -> thưởng/phạt -> kết thúc (người chết **không** được kích hoạt kỹ năng bán máu).
6. **Sau khi chịu sát thương (`After Damage Taken`):** Nếu nạn nhân **vẫn còn sống** sau bước 5 mới chạy lần lượt: **Gian Hùng** (Tào Tháo), **Phản Quỷ** (Tư Mã Ý), **Cương Liệt** (Hạ Hầu Đôn), **Di Kế** (Quách Gia — theo từng `1` điểm sát thương).

---

## 3. Đặc Tả Chi Tiết Bộ Bài 108 Lá (104 Chuẩn + 4 EX)

### 3.1. Phân bổ Tổng Quát (`27♠ + 27♥ + 27♣ + 27♦ = 108` lá)

#### A. Bài Cơ Bản (`53` lá)
| Tên lá | Số lượng | Chất & Số | Quy tắc & Điều kiện biên (Edge Cases) |
| :--- | :---: | :--- | :--- |
| **Sát (`sat`)** | 30 | `7♠` (7,8,8,9,9,10,10)<br>`3♥` (10,10,J)<br>`14♣` (2–10,8,9,10,J,J)<br>`6♦` (6,7,8,9,10,K) | Gây `1` sát thương cho `1` mục tiêu trong tầm đánh. Tối đa `1`/lượt Đánh (trừ *Liên Nỗ / Trương Phi*). Còn dùng để phản ứng *Nam Man*, *Quyết Đấu*, *Tá Đao*, *Kích Tướng*. |
| **Thiểm (`thiem`)** | 15 | `3♥` (2,2,K)<br>`12♦` (2,2,3–10,J,J) | Chỉ dùng ngoài lượt (hoặc trong phản ứng) để né *Sát* hoặc *Vạn Tiễn Tề Phát*. Không thể tự đánh suông. |
| **Đào (`dao`)** | 8 | `7♥` (3,4,6,7,8,9,Q)<br>`1♦` (Q) *(một số bản in lại đổi `6♥` thành `2♦`)* | • Trong pha Đánh: tự hồi `1` máu (cấm dùng khi `hp >= maxHp`).<br>• Ngoài lượt lúc hấp hối: cứu `1` máu cho người có `hp <= 0` (`Cứu Viện` hồi `2` nếu là Tôn Quyền). |

#### B. Cẩm Nang Thường (`31` lá = `30` chuẩn + `1` EX)
*(Tất cả Cẩm nang thường khi sử dụng đều có nhịp hỏi **Vô Giải Khả Kích** trước khi phát huy hiệu lực lên từng mục tiêu).*

| Tên lá | SL | Chất & Số | Luật & Edge Cases khi viết code |
| :--- | :---: | :--- | :--- |
| **Vô Trung Sinh Hữu** | 4 | `7♥, 8♥, 9♥, J♥` | Dùng lên bản thân ở pha Đánh. Nếu không bị *Vô Giải* -> rút ngay `2` lá. |
| **Thuận Thủ Khiên Dương** | 5 | `3♠, 4♠, J♠, 3♦, 4♦` | Chọn `1` người chơi khác có bài (ở tay / trang bị / khu phán xét) và thỏa `distance <= 1` (Hoàng Nguyệt Anh bỏ qua khoảng cách; miễn nhiễm Lục Tốn). Lấy `1` lá vào tay mình (tay lấy ngẫu nhiên úp; trang bị & phán xét chỉ định). |
| **Quá Hà Sái Cầu** | 6 | `3♠, 4♠, Q♠, Q♥, 3♣, 4♣` | Chọn `1` người chơi khác có ít nhất `1` lá ở tay / trang bị / khu phán xét (**không giới hạn khoảng cách**). Hủy `1` lá đó đưa vào chồng bài bỏ. |
| **Quyết Đấu** | 3 | `A♠, A♣, A♦` | Chọn `1` người chơi khác (miễn nhiễm Gia Cát *Không Thành*). **Mục tiêu đánh ra 1 Sát trước**, rồi luân phiên 2 bên. Bên nào không đánh ra `Sát` chịu `1` sát thương từ bên kia (Lữ Bố ép đối phương đánh `2` Sát mỗi lần). *(Lưu ý: chỉ có 1 cửa sổ Vô Giải lúc bắt đầu Quyết Đấu).* |
| **Tá Đao Sát Nhân** | 2 | `Q♣, K♣` | Chọn `(A, B)`: `A !== self`, `A` đang **lắp Vũ khí**, `B` nằm trong tầm đánh của `A` (`B` không bị *Không Thành*, được phép `B === self`). Nếu không bị *Vô Giải*: `A` phải đánh ra `1` lá `Sát` vào `B` (tính như `A` dùng *Sát*, được kích hoạt kỹ năng vũ khí như *Thanh Công / Quán Thạch / Hàn Băng* nhưng **không** tính vào giới hạn `1` Sát/lượt của `A` và không được dùng khi không phải lượt `A` nếu không có *Võ Thánh/Long Đảm*), hoặc `A` giao lá Vũ khí đang cầm vào tay bạn. |
| **Nam Man Nhập Xâm** | 3 | `7♠, K♠, 7♣` | Lần lượt từng người còn sống khác (bắt đầu từ ghế kế tiếp người dùng): hỏi *Vô Giải* riêng cho người đó -> nếu không bị *Vô Giải*, buộc đánh ra `1 Sát` hoặc chịu `1` sát thương từ người dùng. |
| **Vạn Tiễn Tề Phát** | 1 | `A♥` | Lần lượt từng người còn sống khác (kế tiếp người dùng): hỏi *Vô Giải* riêng -> buộc đánh ra `1 Thiểm` (được dùng *Bát Quái Trận / Hộ Giá / Khuynh Quốc / Long Đảm*) hoặc chịu `1` sát thương. |
| **Đào Viên Kết Nghĩa** | 1 | `A♥` | Lần lượt toàn bàn (từ người dùng): ai còn sống và `hp < maxHp` đều hồi `1` máu (mỗi người bị thương có nhịp hỏi *Vô Giải* riêng). *(Vì 104 lá gốc lấy từ 2 bộ bài Tây 52 lá nên có đúng 2 lá `A♥`: 1 Vạn Tiễn + 1 Đào Viên).* |
| **Ngũ Cốc Phong Đăng** | 2 | `3♥, 4♥` | Lật mở số lá bài = số người còn sống. Lần lượt từng người **bắt đầu từ người dùng** -> hỏi *Vô Giải* cho lượt lấy của người đó -> nếu không bị *Vô Giải*, chọn `1` lá trong pool vào tay; ai bị *Vô Giải* bỏ qua. Kết thúc AOE, các lá còn dư đưa xuống chồng bài bỏ. |
| **Vô Giải Khả Kích** | 4 | `J♠, Q♣, K♣, Q♦(EX)` | Dùng ngoài hoặc trong lượt khi **có Cẩm nang** (thường, *Ngũ Cốc/Nam Man*, hoặc Cẩm nang thời gian ngay trước khi lật phán xét) sắp phát huy hiệu lực lên `1` mục tiêu, hoặc chặn chính một lá *Vô Giải* khác. Số lần chồng *Vô Giải* là không giới hạn (**lẻ** = hủy hiệu lực, **chẵn** = khôi phục hiệu lực). |

#### C. Cẩm Nang Thời Gian (`5` lá = `4` chuẩn + `1` EX)
| Tên lá | SL | Chất & Số | Luật & Edge Cases |
| :--- | :---: | :--- | :--- |
| **Lạc Bất Tư Thục** | 3 | `6♠, 6♥, 6♣` | Đặt ngang vào khu Phán xét của **người khác** (không đè trùng tên, miễn nhiễm Lục Tốn). Đầu lượt người đó ở pha `JUDGE`: hỏi *Vô Giải* -> lật `1` lá phán xét -> nếu **KHÔNG phải chất Cơ (`♥`)**, người đó **bỏ qua pha `PLAY`** ở lượt này. Sau phán xét, lá *Lạc* vào chồng bài bỏ. |
| **Thiểm Điện** | 2 | `A♠(EX), Q♥` | Đặt vào khu Phán xét của **bản thân** (nếu chưa có *Thiểm Điện*). Đầu lượt tới ở pha `JUDGE`: hỏi *Vô Giải* -> nếu bị *Vô Giải* thì chuyển thẳng sang người kế tiếp (chưa có *Thiểm Điện*) mà không lật! Nếu không bị *Vô Giải*, lật `1` lá phán xét: nếu là **Bích `2..9` (`♠2–♠9`)** thì chịu **`3` sát thương Lôi** (Thiên tai, `sourceSeat = null`) rồi hủy *Thiểm Điện* vào chồng bỏ; nếu không trúng thì **chuyển sang khu phán xét của người sống kế tiếp** chưa có *Thiểm Điện*. |

#### D. Trang Bị (`19` lá = `17` chuẩn + `2` EX)
- **Vũ khí (`10` lá):**
  1. **Gia Cát Liên Nỗ (`2` lá: `A♣, A♦`, Tầm `1`):** Đánh `Sát` không giới hạn số lần trong pha `PLAY`.
  2. **Từ Hùng Song Cổ Kiếm (`1` lá: `2♠`, Tầm `2`):** Khi dùng `Sát` chọn mục tiêu **khác giới**, có thể bắt mục tiêu chọn bỏ `1` lá tay HOẶC cho bạn rút `1` lá (xử lý **trước** khi mục tiêu né *Thiểm*).
  3. **Thanh Công Kiếm (`1` lá: `6♠`, Tầm `2`):** Kỹ năng khóa — `Sát` của bạn **bỏ qua Giáp** mục tiêu (*Bát Quái Trận*, *Nhân Vương Thuẫn*).
  4. **Hàn Băng Kiếm (`1` lá: `2♠ EX`, Tầm `2`):** Khi `Sát` sắp gây sát thương lên mục tiêu có ít nhất `1` lá (tay hoặc trang bị), có thể **ngăn toàn bộ sát thương** để hủy tối đa `2` lá của nạn nhân (không hủy khu Phán xét; vì ngăn sát thương nên không kích hoạt kỹ năng nhận sát thương).
  5. **Thanh Long Yển Nguyệt Đao (`1` lá: `5♠`, Tầm `3`):** Khi `Sát` của bạn bị *Thiểm* hóa giải, có thể tiếp tục dùng thêm `1` lá `Sát` nữa lên **đúng mục tiêu đó** (không tính vào giới hạn `1` Sát/lượt; có thể lặp lại nếu còn `Sát`).
  6. **Trượng Bát Xà Mâu (`1` lá: `Q♠`, Tầm `3`):** Dùng `2` lá **trên tay** bất kỳ coi như `1` lá `Sát` vô sắc (hoặc đỏ/đen tùy màu 2 lá: 2 đỏ = Sát Đỏ, 2 đen = Sát Đen, 1 đỏ 1 đen = Sát Không màu -> Nhân Vương Thuẫn không chặn được Sát Không màu!).
  7. **Quán Thạch Phủ (`1` lá: `5♦`, Tầm `3`):** Khi `Sát` bị *Thiểm* hóa giải, có thể **bỏ `2` lá** (tay hoặc trang bị khác — gồm cả bỏ chính *Quán Thạch Phủ* nếu không còn lựa chọn, nhưng lúc bị phản ứng vẫn đang hiệu lực) để ép `Sát` vẫn gây sát thương bình thường.
  8. **Phương Thiên Họa Kích (`1` lá: `Q♦`, Tầm `4`):** Khi lá `Sát` bạn dùng là **lá bài cuối cùng trên tay**, được chọn tối đa **`3` mục tiêu** trong tầm đánh (giải quyết từng người theo vòng ghế). *(Cầm trên tay 2 lá rồi dùng Trượng Bát Xà Mâu coi là 2 lá cuối không tính hay có? Trong bản Chuẩn nếu cả 2 lá rời tay cùng lúc khi dùng Sát -> còn 0 lá trên tay -> cũng thỏa; bản gốc chỉ cần tại thời điểm tuyên bố mục tiêu số bài còn lại trên tay = `0`).*
  9. **Kỳ Lân Cung (`1` lá: `5♥`, Tầm `5`):** Khi `Sát` gây sát thương thành công, được hủy `1` lá Ngựa (`+1` hoặc `-1`) đang trang bị của mục tiêu.
- **Giáp (`3` lá):**
  1. **Bát Quái Trận (`2` lá: `2♠, 2♣`):** Khi cần dùng hoặc đánh ra *Thiểm*, được lật `1` lá phán xét: ra **Đỏ (`♥/♦`)** coi như ra `1 Thiểm`.
  2. **Nhân Vương Thuẫn (`1` lá: `2♣ EX`):** Kỹ năng khóa — mọi lá `Sát` màu **Đen (`♠/♣`)** nhắm vào bạn đều **vô hiệu**.
- **Ngựa (`6` lá):**
  - **Ngựa `+1` Phòng thủ (`3` lá: Tuyệt Ảnh `5♠`, Đích Lố `5♣`, Trảo Hoàng Phi Điện `K♥`):** Mọi người nhìn khoảng cách tới bạn `+1`.
  - **Ngựa `-1` Tấn công (`3` lá: Xích Thố `5♥`, Đại Uyên `K♠`, Tử Tinh `K♦`):** Bạn nhìn khoảng cách tới mọi người `-1`.

---

## 4. Đặc Tả Từng Kỹ Năng Riêng Của `25` Tướng Bản Chuẩn (Code-Ready Spec)

### 4.1. Thế lực THỤC (`7` Tướng)

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
   - **Tập Trí** *(Khi dùng Cẩm nang thường):* Ngay tại thời điểm sử dụng `1` lá **Cẩm nang thường** (tuyên bố dùng, **trước** khi kiểm tra *Vô Giải* — tức dù bị *Vô Giải* vẫn được rút!), rút ngay **`1` lá**. *(Không kích hoạt cho Cẩm nang thời gian như Lạc/Thiểm Điện).*
   - **Kỳ Tài** *(Khóa):* Sử dụng Cẩm nang **không bị giới hạn khoảng cách** (*Thuận Thủ Khiên Dương* chọn được bất kỳ ai).

### 4.2. Thế lực NGỤY (`7` Tướng)

8. **Tào Tháo (`4` máu · Nam · Chủ Công):**
   - **Gian Hùng** *(Sau khi chịu sát thương):* Nếu nguồn gây sát thương là **lá bài** (hoặc nhiều lá như *Trượng Bát Xà Mâu*), lấy các lá đó về tay (không áp dụng cho sát thương từ kỹ năng không kèm bài như *Ly Gián/Phản Gián/Cương Liệt* hay *Thiểm Điện*).
   - **Hộ Giá** *(Chủ Công · Phản ứng):* Khi cần dùng hoặc đánh ra *Thiểm* (bị *Sát* hoặc *Vạn Tiễn*), hỏi lần lượt các tướng **Ngụy khác** theo vòng ghế đánh ra `1 Thiểm` giúp bạn (nếu gặp *Lữ Bố Vô Song*, hỏi đủ 2 lần).
9. **Tư Mã Ý (`3` máu · Nam):**
   - **Phản Quỷ** *(Sau khi chịu sát thương):* Nếu có `sourceSeat` (và `sourceSeat` có bài trên tay hoặc trang bị), được bốc ngẫu nhiên `1` lá trên tay hoặc chọn `1` lá trang bị của nguồn sát thương về tay mình (**`1` lần/lượt sát thương**, bất kể `1` hay `2` máu).
   - **Quỷ Tài** *(Trước khi lá Phán xét có hiệu lực):* Đánh ra `1` lá bài **trên tay** để thay thế lá phán xét hiện tại (lá phán xét cũ vào chồng bài bỏ).
10. **Hạ Hầu Đôn (`4` máu · Nam):**
    - **Cương Liệt** *(Sau khi chịu sát thương có `sourceSeat` alive):* Lật `1` lá phán xét; nếu kết quả **KHÔNG phải chất Cơ (`♥`)**, nguồn sát thương buộc chọn: **bỏ `2` lá trên tay** HOẶC chịu **`1` sát thương** từ Hạ Hầu Đôn (**`1` lần/lần trúng đòn**; nếu nguồn có `< 2` lá trên tay thì bắt buộc chọn mất 1 máu).
11. **Trương Liêu (`4` máu · Nam):**
    - **Đột Tập** *(Pha `DRAW`):* Có quyền **bỏ qua việc rút `2` lá** từ chồng bài rút, thay bằng chọn `1` hoặc `2` người chơi khác đang có bài trên tay, lấy từ tay mỗi người đó **`1` lá ngẫu nhiên**.
12. **Hứa Chử (`4` máu · Nam):**
    - **Lỏa Y** *(Pha `DRAW`):* Có quyền **rút ít hơn `1` lá** (chỉ rút `1` lá); đổi lại cho tới hết lượt, mọi lá **`Sát`** hoặc **`Quyết Đấu`** mà Hứa Chử là người gây sát thương đều **`+1` sát thương**.
13. **Quách Gia (`3` máu · Nam):**
    - **Thiên Đố** *(Ngay sau khi lá Phán xét của bản thân có hiệu lực):* Thu lấy lá phán xét đó về tay (áp dụng cho cả *Lạc Bất Tư Thục, Thiểm Điện, Bát Quái Trận, Cương Liệt*).
    - **Di Kế** *(Sau khi chịu sát thương — tính theo TỪNG `1` điểm máu mất):* Mất `N` máu kích hoạt **`N` lần**; mỗi lần rút `2` lá từ chồng bài rút rồi tự giữ hoặc chia tùy ý từng lá vào tay những người còn sống.
14. **Chân Cơ (`3` máu · Nữ):**
    - **Lạc Thần** *(Đầu lượt `TURN_START` — trước `JUDGE`):* Liên tục lật lá phán xét; nếu ra **màu Đen (`♠ / ♣`)** thu ngay lá đó về tay và được lật tiếp; ra **màu Đỏ (`♥ / ♦`)** thì dừng (lá Đỏ bỏ xuống chồng bỏ) hoặc tự dừng bất cứ lúc nào.
    - **Khuynh Quốc** *(Chuyển đổi):* Có thể dùng bất kỳ lá **màu Đen (`♠ / ♣`) trên tay** như lá `Thiểm` (không dùng trang bị).

### 4.3. Thế lực NGÔ (`8` Tướng)

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

### 4.4. Thế lực QUẦN (`3` Tướng)

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

---

## 5. Báo Cáo Đối Chiếu & Kiểm Toán Mã Nguồn Hiện Tại (`/honest-advisor` & `/ultrathinking`)

Phần đối chiếu thực tế giữa [packages/shared/src](./packages/shared/src/index.ts) hiện tại và bộ luật chuẩn chính thức Yoka Games:

### 5.1. Những điểm code hiện tại ĐÃ LÀM ĐÚNG chuẩn Yoka Standard (Không bị lẫn Bản Nâng Cấp)
1. **Ranh giới Bản Chuẩn (`0%` nhiễm Giới Hạn Đột Phá / Quân Tranh):** Toàn bộ `25` tướng và `108` lá đều đang viết thuần theo Bản Tiêu Chuẩn gốc (*Nhân Đức hồi 1 máu, Gian Hùng không rút thêm, Chế Hành bỏ N rút N, Quỷ Tài chỉ dùng bài tay, Kết Hôn bỏ 2 lá tay & đầy máu vẫn dùng được, Bế Nguyệt rút 1 lá*).
2. **Thứ tự Timing khó đã chuẩn xác (`combatCore.ts`):**
   - `Quan Tinh / Lạc Thần` chạy ở `TURN_START` **trước** *Lạc Bất Tư Thục / Thiểm Điện* (`JUDGE`).
   - *Cầu Đào Hấp Hối (`WAIT_PEACH_RESCUE`)* ưu tiên giải quyết trên `interruptStack` **trước** các kỹ năng bán máu *Gian Hùng / Phản Quỷ / Cương Liệt / Di Kế* (nếu chết luôn thì không kích hoạt bán máu).
   - *Hàn Băng Kiếm* ngăn sát thương -> không kích hoạt *Gian Hùng / Phản Quỷ / Cương Liệt / Di Kế*.
3. **Bộ bài 108 lá khớp chính xác (`53 Cơ bản + 31 Cẩm nang thường + 5 Thời gian + 19 Trang bị`):** Bao gồm đúng 4 lá EX chuẩn (*Vô Giải `Q♦`, Thiểm Điện `A♠`, Hàn Băng Kiếm `2♠`, Nhân Vương Thuẫn `2♣`*).

### 5.2. Lịch sử Các Lỗi Đã Vá Chuẩn Yoka & Lưu Ý Biên Còn Lại (Đã kiểm chứng 2026-11-18)
1. **✅ [Đã vá chuẩn] `Điêu Thuyền — Ly Gián` (`wuQun.ts`):** Đã gắn kiểm tra `Không Thành` (Gia Cát Lượng hết bài không thể làm mục tiêu thứ 2) và mở cửa sổ `Vô Giải Khả Kích` (`openNullificationWindow`) đúng quy chuẩn Yoka *Quyết Đấu*.
2. **✅ [Đã vá chuẩn] `Bát Quái Trận` gặp `Lữ Bố — Vô Song` & `Tào Tháo — Hộ Giá` (`combatCore.ts`, `combat.ts`):** Mục tiêu được phán xét Bát Quái và kêu gọi *Hộ Giá* cho từng lá *Thiểm* còn thiếu (tối đa 2 lần trước *Lữ Bố*), và gom chung hậu xử lý né xong (`Quán Thạch Phủ` / `Thanh Long Đao`) qua `completeStrikeDodged`.
3. **✅ [Đã vá chuẩn] `Quán Thạch Phủ` tự bỏ chính mình (`combatCore.ts`, `combat.ts`):** Đã cho phép tính cả lá *Quán Thạch Phủ* vào tổng `>= 2` lá có thể bỏ để ép trúng *Sát* theo Yoka Official FAQ.
4. **✅ [Đã vá chuẩn] `Hoàng Nguyệt Anh — Tập Trí` & `Lục Tốn — Liên Doanh` (`combat.ts`):** Đã kích hoạt *Tập Trí* khi Hoàng Nguyệt Anh đánh *Vô Giải Khả Kích* (`NORMAL_SCROLL`) và chuẩn hóa qua `SKILL_RUNTIME.discardHandCards` ở `RESPOND_NULLIFICATION` & `RESPOND_TU_HUNG` để Lục Tốn luôn rút `1` lá khi mất lá tay cuối.
5. **✅ [Đã đồng bộ tài liệu] `REQUIREMENTS.md` mục 3.3:** Đã chỉnh lại đúng số lượng `31` Cẩm nang thường, `5` Cẩm nang thời gian, `10` Vũ khí khớp `cards/catalog.ts`.
6. **🟡 [Edge Case lưu ý giao diện & vận hành]:**
   - **Đại Kiều (*Lưu Ly*) bỏ chính Vũ khí:** Trong `combat.ts` kiểm tra tầm đánh **trước** khi bỏ lá (tuyên bố mục tiêu hợp lệ trước khi trả chi phí bỏ lá theo Yoka FAQ).
   - **Khổ Nhục (`Hoàng Cái`) + Cầu Đào khi máu về `0`:** Đã xử lý mở Cầu Đào trước -> nếu sống lại mới rút `2` lá.
   - **Chiều vòng ghế bàn tròn:** Giữ đồng nhất *chiều kim đồng hồ* trên cả 4 vòng (lượt đánh / AOE / Cầu Đào / khoảng cách) như lựa chọn của Chủ dự án.
