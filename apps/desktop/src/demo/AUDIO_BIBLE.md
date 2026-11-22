# AUDIO_BIBLE.md — Tam Quốc Sát Demo Audio v2 ("Cổ Phong Thực Vật Liệu")

> **Dự án:** Tam Quốc Sát (Windows Desktop · 4–8 Người chơi)
> **Vai trò:** `audio-director` · **Phiên bản:** v2.0 (100% Real Physical Materials via `earshot` 1.0.0)
> **Tham chiếu code:** [demoAudioEngine.ts](./demoAudioEngine.ts) · [DemoAudioStudio.tsx](./DemoAudioStudio.tsx) · [DESIGN.md](../../../../DESIGN.md)

---

## 1. Bản Sắc Âm Thanh (Sonic Identity)

**Chủ đề cốt lõi: "Cổ Phong Thực Vật Liệu" (Ancient Three Kingdoms Tactile Realism)**
Không gian âm thanh đặt người chơi ngồi trước **bàn gỗ mun Doanh Trại Xích Bích (`Huyền Mộc #181B20`)** giữa đêm lửa bập bùng. Mọi tương tác giao diện, lá bài, cẩm nang, binh khí và cao trào sinh tử đều phải mang trọng lượng vật lý có thật — nghe như tay người chạm vào **thẻ bài giấy bồi dày, gỗ mun, ấn đá ngọc, thép rèn thời Hán, giáp da/sắt, trống trận da trâu, khánh/chiêng đồng và đàn tranh ngũ cung**.

### Nguyên tắc sắt
1. **0% Synth Beeps / 0% Chiptune / 0% Raw Oscillators:** Tuyệt đối **CẤM** dùng các âm tổng hợp điện tử trong `earshot` (`note/fm_bell`, `ui/error_buzz`, `stab/chord`, `kick/electro`, `snare/electro`, `hat/electro`, `menu/move`, `power_down/synth`, `braam/brass`, `bell/bike`, `bell/desk`, `click/mouse`, `click/trackpad`, `pro_hover_tick/*`, `shot/pistol`).
2. **100% Thiết kế học từ thu âm thật (Learned Public-Domain Recordings) & Nhạc khí mộc:** Chỉ dùng các ID đã xác minh tồn tại trong `earshot.exe` (`earshot sounds --search` / `earshot.make.sounds()`), ưu tiên phối ghép đa lớp (`make --recipe`) để đạt độ dày, chiều sâu không gian (`space: "dry" | "room" | "hall"`) và sắc thái Tam Quốc đặc trưng.
3. **Hệ ngũ cung thống nhất (D Pentatonic Cổ Phong):** Mọi âm có cao độ rõ rệt (chuông ngọc, đàn tranh `note/koto`, đàn hạc `note/harp`, dương cầm `note/dulcimer`, bát đồng `note/singing_bowl`) đều quy về thang âm **Cung Thương Giốc Chủy Vũ trên gốc `D4` (`D–E–F#–A–B` hoặc `D–E–G–A–B`)** để hòa quyện tự nhiên với nhạc nền Xích Bích (`108 BPM`).
4. **Không chấp nhận hàng thế vai (`earshot makes no X`) hay kết quả lỗi (`!clean`):** Mọi file render xong phải qua kiểm định Python (`soundfile` + `numpy`) cắt khoảng lặng đầu `< 10 ms`, chống rè đỉnh `<= -1.0 dBFS` (`<= 0.891`), fade-out đuôi sạch `0` tiếng tách.

---

## 2. Năm Trụ Cột Vật Liệu Thật (5 Real Material Pillars)

| # | Trụ cột vật liệu | Bản chất âm học | ID `earshot` gốc đã xác minh | Ứng dụng chính |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Gỗ Mun & Mõ Tre**<br>*(Ebony Wood & Woodblocks)* | Đanh, gọn, ấm, dứt khoát, không chói tai khi lặp lại nhiều lần | `hover/fingertip`, `tick/wood`, `tock/wood`, `knock/wood`, `knock/hollow`, `knock/table`, `knock/soft`, `knock/desk`, `clave/click`, `note/wood_block`, `gavel/strike`, `open/drawer`, `close/drawer`, `book/open`, `book/close`, `book/place`, `book/shut`, `rim/click`, `slapstick/crack` | UI Hover/Click, Báo lỗi, Mở/Đóng bảng, Đếm 5s cuối, Thả bài lên bàn |
| **2** | **Giấy Bồi & Lụa Vải**<br>*(Thick Cardstock & Silk/Cloth)* | Sột soạt khô giòn, ma sát thật giữa giấy cứng và áo bào | `paper/card`, `paper/page`, `page/turn`, `cards/shuffle`, `flick/paper`, `flick/thin`, `slide/paper`, `paper/rip`, `whoosh/cloth`, `swipe/cloth`, `leather/grab` | Chia bài, Rút bài, Xào bài, Thuận Thủ / Quá Hà, Né Thiểm |
| **3** | **Đá Khắc, Ngọc Bích & Đồng Thanh**<br>*(Carved Stone, Jade & Bronze)* | Lạnh, ngân vang tự nhiên, uy nghiêm cổ điển | `note/singing_bowl`, `note/crotales`, `note/tubular_bell`, `note/wind_chime`, `gong/hit`, `boom/wide`, `crash/dark`, `crash/bright`, `cymbal/reverse`, `cymbal/orchestral`, `glass/tap`, `glass/set`, `glass/clink`, `tock/glass`, `break/glass`, `break/rock`, `step/stone` | Khóa tướng, Vào/Rời phòng, Sẵn sàng, Vô Giải, Lạc Bất Tư Thục, Phán xét |
| **4** | **Thép Rèn, Da Thuộc & Giáp Sắt**<br>*(Forged Steel, Leather & Armor)* | Sắc bén, va đập kim loại thật + thân thịt/da thuộc có trọng lượng | `sword/draw`, `sword/swing`, `sword/cut`, `clash/sword`, `hit/metal`, `shield/block`, `shine/blade`, `whoosh/blade`, `swing/blade`, `swing/heavy`, `bow/shot`, `arrow/hit`, `hit/punch`, `punch/body`, `hit/crit`, `hit/drop`, `land/heavy`, `impact/slam` | Đánh Sát, Vũ khí, Phòng cụ, Quyết Đấu, Trúng đòn, Vạn Tiễn/Nam Man |
| **5** | **Trống Chiến, Tuấn Mã & Ngũ Cung**<br>*(War Drums, Steeds & Pentatonic Strings)* | Trầm hùng, hữu cơ, giàu cảm xúc sinh tử & chiến thắng | `kick/deep`, `kick/punch`, `kick/soft`, `tom/floor`, `tom/mid`, `tom/high`, `snare/fat`, `snare/tight`, `snare/brush`, `boom/deep`, `boom/short`, `boom/heavy`, `thump/book`, `thump/door`, `thump/soft`, `thunder/crack`, `thunder/roll`, `thunder/clap`, `horse/trot`, `horse/neigh`, `heart/beat`, `heartbeat/pulse`, `whoosh/fast`, `whoosh/soft`, `whoosh/deep`, `whoosh/sweep`, `swoosh/in`, `swoosh/out`, `rise/breath`, `fall/air`, `fire/whoosh`, `wind/mountain`, `note/koto`, `note/harp`, `note/pizzicato`, `note/dulcimer`, `note/upright_bass`, `note/handpan` | Đếm ngược vào trận, Đến lượt, Ngựa +1/-1, Hấp hối, Thiểm Điện, Đào, Hồi máu, Kết liễu, Thắng/Thua |

### Bảng Quy Đổi Cao Độ Nhạc Khí `earshot` (Đã đo thực tế bằng `--json`)
Khi viết recipe JSON với `"pitch": <semitones>`, tham chiếu đúng cao độ gốc của từng nhạc khí thật:
- `note/koto` *(Đàn Tranh / Guzheng)*: gốc **`D4`** → `0=D4`, `+2=E4`, `+4=F#4`, `+5=G4`, `+7=A4`, `+9=B4`, `+12=D5`, `-5=A3`
- `note/harp` *(Đàn Hạc)* & `note/pizzicato`: gốc **`C5`** → `-10=D4`, `-8=E4`, `-5=G4`, `-3=A4`, `-1=B4`, `+2=D5`, `+4=E5`
- `note/dulcimer` *(Dương Cầm gõ)*: gốc **`A4`** → `-7=D4`, `-5=E4`, `-3=F#4`, `-2=G4`, `0=A4`, `+2=B4`, `+5=D5`
- `note/singing_bowl` *(Khánh / Bát Đồng)*: gốc **`A3`** → `-7=D3`, `-5=E3`, `0=A3`, `+5=D4`, `+7=E4`, `+12=A4`
- `note/tubular_bell` *(Chuông Đồng Lớn)*: gốc **`C5`** → `-15=A3`, `-10=D4`, `-5=G4`, `-3=A4`
- `note/crotales` *(Chuông Ngọc / Khánh Nhỏ)*: gốc **`C7`** → `-10=D6`, `-7=F6`, `-3=A6`, `-12=C6`
- `note/wood_block` *(Mõ Gỗ)*: gốc **`C6`** → `-10=D5`, `-5=G5`, `-3=A5`, `-12=C5`
- `note/upright_bass` *(Đàn Trầm Mộc)*: gốc **`D2`** → `0=D2`, `+5=G2`, `+7=A2`, `+12=D3`

---

## 3. Quy Chuẩn Độ Lớn, Ducking & Chống Mệt Thính Giác (Accessibility & Fatigue)

| Loại âm thanh | Bus | Target LUFS | Peak trần (dBTP) | Leading silence | Quy tắc chống mệt & Tiếp cận |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **UI & Tương tác thường xuyên** (`HOVER`, `CLICK`, `PANEL_*`, `ROOM_*`, `DEAL`, `CARD_PLAY`, `TIMER_TICK`) | `ui` / `sfx` | **`-16 LUFS`** *(riêng `HOVER` `-20` đến `-18` LUFS)* | `-1.0 dBFS` (`<= 0.891`) | `< 10 ms` | Cắt dải chói `lowpass <= 7500 Hz` để không rít tai khi spam 8 người; `cooldownMs` `45–180 ms`; biến thiên cao độ nhẹ (`pitchJitter`) tránh máy móc. |
| **Chiến đấu & Trang bị chuẩn** (`SAT`, `THIEM`, `WEAPON`, `ARMOR`, `MOUNT_*`, `STEAL_*`, `HERO_SKILL`, `JUDGE`, `CONTROL_SCROLL`, `DAO`, `HEAL`, `TURN_START`, `ACTION_PROMPT`) | `sfx` / `alert` | **`-14 LUFS`** | `-1.0 dBFS` (`<= 0.891`) | `< 10 ms` | Tách dải tần rõ giữa tiếng giấy (`1.5–4 kHz`), tiếng thép (`2–6.5 kHz`) và thân trống (`60–180 Hz`); mọi cảnh báo `alert` đều có nhãn/viền thị giác song song theo `DESIGN.md`. |
| **Cao trào & Kết trận lớn** (`HERO_LOCK`, `COUNTDOWN_START`, `NULLIFICATION`, `DUEL`, `TABLE_SKILL`, `LIGHTNING`, `DAMAGE`, `ELIMINATION`, `DYING`, `VICTORY`, `DEFEAT`) | `sfx` / `alert` | **`-12 LUFS`** *(riêng `DAMAGE` `-13` / `-14`, các cao trào lớn `-12`)* | `-1.0 dBFS` (`<= 0.891`) | `< 10 ms` | Tự động hạ nhạc nền (`duckMusicMs`: `500–1400 ms`) khi kích hoạt; `DYING` dùng nhịp tim thật + chuông đồng ấm thay vì còi hú tần số cao gây giật mình. |

---

## 4. Bảng Đặc Tả Đầy Đủ 38 Âm (`DemoCueId`)

### Nhóm A — `sfx-ui-room` (16 file tại `apps/desktop/src/demo/audio-v2/ui/`)

| # | `DemoCueId` | Bus | Công thức vật liệu thật (`earshot` IDs & cấu trúc recipe) | Target Dur (ms) | Target LUFS | Duck (ms) | Ghi chú chống mệt & cảm giác tay |
| :-: | :--- | :-: | :--- | :---: | :---: | :-: | :--- |
| 1 | **`HOVER`** | `ui` | **Single / Recipe:** `hover/fingertip` (đầu ngón tay chạm mặt gỗ mun), `lowpass: 4200`, cắt gọn đuôi | `60–110` | `-16` *(gain mix nhẹ `0.72`)* | `0` | Cực ngắn, khô, trầm ấm; `cooldownMs: 55`, `pitchJitter: 0.025`, tuyệt đối không có âm sắc kim loại/chói `> 4.5 kHz`. |
| 2 | **`CLICK`** | `ui` | **Recipe 2 lớp (`dry`):** `tick/wood` (`pitch: -2`, `gain: 0`) + `knock/soft` (`cut: [0, 0.08]`, `lowpass: 1800`, `gain: -6`) | `80–140` | `-16` | `0` | Tiếng gõ con cờ/mộc bản dứt khoát; `cooldownMs: 45`, `pitchJitter: 0.02`. |
| 3 | **`PANEL_OPEN`** | `ui` | **Recipe 2 lớp (`room`):** `book/open` (`gain: 0`) + `slide/paper` (`at: 0.02`, `highpass: 400`, `lowpass: 5500`, `gain: -4`) | `280–420` | `-16` | `0` | Mở cuộn cổ thư tre/giấy bồi lướt nhẹ, không có tiếng lạch cạch hiện đại. |
| 4 | **`PANEL_CLOSE`** | `ui` | **Recipe 2 lớp (`room`):** `slide/paper` (`pitch: -3`, `lowpass: 3800`, `gain: -3`) + `book/close` (`at: 0.06`, `cut: [0, 0.25]`, `gain: -1`) | `240–360` | `-16` | `0` | Thu gọn cuộn giấy và khép bìa gỗ êm ái. |
| 5 | **`UI_ERROR`** | `alert` | **Recipe 2 nhịp gỗ (`dry`):** `knock/hollow` (`pitch: -2`, `at: 0`, `gain: 0`) + `knock/hollow` (`pitch: -5`, `at: 0.12`, `gain: 0`, `lowpass: 2400`) | `280–380` | `-14` | `0` | 2 tiếng gõ mõ gỗ trầm rơi xuống (cảnh báo nút khóa/sai thao tác, không dùng `error_buzz` hay còi chói). |
| 6 | **`ROOM_JOIN`** | `ui` | **Recipe ngũ cung (`room`):** `note/crotales` (`pitch: -10` → `D6`, `at: 0`, `dur: 0.35`, `gain: -3`) + `note/crotales` (`pitch: -3` → `A6`, `at: 0.09`, `dur: 0.55`, `gain: 0`) + `knock/soft` (`at: 0`, `gain: -12`) | `550–750` | `-16` | `0` | Chuông ngọc 2 nốt `D6 → A6` thanh thoát báo khách vào phòng. |
| 7 | **`ROOM_LEAVE`** | `ui` | **Recipe (`room`):** `note/singing_bowl` (`pitch: +7` → `E4`, `at: 0`, `dur: 0.32`, `gain: -4`) + `note/singing_bowl` (`pitch: +5` → `D4`, `at: 0.11`, `dur: 0.48`, `gain: -1`, `lowpass: 3200`) | `480–680` | `-16` | `0` | Âm bát đồng 2 nốt lắng xuống nhẹ nhàng (`E4 → D4`), không bi lụy. |
| 8 | **`READY_ON`** | `ui` | **Recipe (`room`):** `note/singing_bowl` (`pitch: +5` → `D4`, `dur: 0.55`, `gain: 0`) + `note/crotales` (`pitch: -3` → `A6`, `at: 0.01`, `dur: 0.45`, `gain: -8`) + `clave/click` (`pitch: -4`, `at: 0`, `gain: -7`) | `450–680` | `-15` | `0` | Tiếng gõ khánh đồng chắc tay kết hợp dùi gỗ rõ nét. |
| 9 | **`HERO_LOCK`** | `sfx` | **Recipe 3 lớp (`room`):** `gavel/strike` (`pitch: -4`, `gain: 0`) + `kick/deep` (`cut: [0, 0.4]`, `lowpass: 180`, `gain: -3`) + `note/singing_bowl` (`pitch: -7` → `D3`, `at: 0.03`, `dur: 0.95`, `gain: -7`) | `850–1150` | `-12` | `550` | Đóng triện đá nặng lên bàn gỗ + ngân đồng uy nghiêm. |
| 10 | **`COUNTDOWN_START`** | `alert` | **Recipe 5 lớp (`hall`):** `tom/floor` (`pitch: -2`, `at: 0`, `gain: -2`) + `tom/floor` (`pitch: 0`, `at: 0.32`, `gain: -1`) + `tom/mid` (`pitch: -2`, `at: 0.64`, `gain: 0`) + `kick/deep` (`at: 0.96`, `gain: +1`) + `gong/hit` (`at: 0.96`, `dur: 1.55`, `fade_out: 0.6`, `gain: -2`) | `2200–2600` | `-12` | `1200` | 3 nhịp trống chiến dồn lực (`0s, 0.32s, 0.64s`) → vỡ òa chiêng đồng mở trận (`0.96s`). |
| 11 | **`DAO`** | `sfx` | **Recipe (`room`):** `note/koto` (`pitch: 0` → `D4`, `at: 0`, `dur: 0.45`, `gain: -3`) + `note/koto` (`pitch: +4` → `F#4`, `at: 0.11`, `dur: 0.45`, `gain: -2`) + `note/koto` (`pitch: +7` → `A4`, `at: 0.22`, `dur: 0.70`, `gain: 0`) + `note/wind_chime` (`at: 0.18`, `dur: 0.65`, `lowpass: 6500`, `gain: -11`) | `800–1050` | `-14` | `0` | Hồi sinh ấm áp trên đàn tranh D-major (`D4–F#4–A4`) + thoảng chuông gió thanh tịnh. |
| 12 | **`HEAL`** | `sfx` | **Recipe (`room`):** `note/harp` (`pitch: -10` → `D4`, `at: 0`, `dur: 0.40`, `gain: -3`) + `note/harp` (`pitch: -8` → `E4`, `at: 0.10`, `dur: 0.40`, `gain: -2`) + `note/harp` (`pitch: -3` → `A4`, `at: 0.20`, `dur: 0.65`, `gain: 0`) + `note/pizzicato` (`pitch: +2` → `D5`, `at: 0.32`, `dur: 0.50`, `gain: -4`) | `750–1000` | `-14` | `0` | Thanh Nang / Kết Nhân: dải đàn hạc & dây búng nhẹ nhàng (`D4–E4–A4–D5`). |
| 13 | **`DYING`** | `alert` | **Recipe (`room`):** `heart/beat` (`cut: [0, 0.85]`, `gain: +1`, `lowpass: 380`) + `kick/deep` (`at: 0.02`, `cut: [0, 0.3]`, `gain: -3`) + `note/singing_bowl` (`pitch: +12` → `A4`, `at: 0.05`, `dur: 0.45`, `gain: -6`) + `note/singing_bowl` (`pitch: +10` → `G4`, `at: 0.48`, `dur: 0.65`, `gain: -5`) | `1000–1250` | `-12` | `1050` | Nhịp tim thật dồn dập + 2 tiếng khánh đồng khẩn thiết nhưng ấm, không rít. |
| 14 | **`TIMER_TICK`** | `alert` | **Recipe (`dry`):** `note/wood_block` (`pitch: -5` → `G5`, `gain: 0`) + `tick/wood` (`at: 0.005`, `gain: -4`, `lowpass: 4500`) | `100–170` | `-16` | `0` | Tiếng gõ mõ gỗ khô gọn; `cooldownMs: 180`, `pitchJitter: 0.02`, tránh mỏi tai 5s cuối. |
| 15 | **`VICTORY`** | `alert` | **Recipe (`hall`):** `kick/deep` (`at: 0`, `gain: 0`) + `gong/hit` (`at: 0`, `dur: 1.8`, `gain: -4`) + `note/koto` ngũ cung đi lên: `D4` (`at: 0.05`, `pitch: 0`), `F#4` (`at: 0.20`, `pitch: +4`), `A4` (`at: 0.36`, `pitch: +7`), `D5` (`at: 0.54`, `pitch: +12`, `dur: 1.4`) + `note/dulcimer` (`at: 0.54`, `pitch: +5` → `D5`, `dur: 1.5`, `gain: -3`) + `cymbal/orchestral` (`at: 0.52`, `dur: 1.5`, `gain: -8`, `lowpass: 7500`) | `2000–2500` | `-12` | `1400` | Khải hoàn đại thắng hào sảng: trống + chiêng + đàn tranh & dương cầm dâng hợp âm `D5`. |
| 16 | **`DEFEAT`** | `alert` | **Recipe (`hall`):** `kick/deep` (`pitch: -3`, `lowpass: 240`, `at: 0`, `gain: -1`) + `fall/air` (`at: 0`, `dur: 1.3`, `lowpass: 2200`, `gain: -9`) + `note/koto` ngũ cung hạ dần: `A4` (`at: 0.08`, `pitch: +7`, `dur: 0.45`), `G4` (`at: 0.38`, `pitch: +5`, `dur: 0.45`), `E4` (`at: 0.68`, `pitch: +2`, `dur: 0.50`), `D4` (`at: 1.00`, `pitch: 0`, `dur: 1.3`) + `note/upright_bass` (`pitch: 0` → `D2`, `at: 1.00`, `dur: 1.3`, `gain: -4`) + `note/singing_bowl` (`pitch: -7` → `D3`, `at: 1.00`, `dur: 1.35`, `gain: -6`) | `2100–2600` | `-12` | `1400` | Thu quân bi tráng bằng **nhạc khí mộc thật** (trống trầm, gió thu, đàn tranh & trầm mộc hạ về `D`, bát đồng ngân tắt). *(Không dùng sáo điện tử giả).* |

---

### Nhóm B — `sfx-combat` (22 file tại `apps/desktop/src/demo/audio-v2/combat/`)

| # | `DemoCueId` | Bus | Công thức vật liệu thật (`earshot` IDs & cấu trúc recipe) | Target Dur (ms) | Target LUFS | Duck (ms) | Ghi chú vật liệu & cảm giác chiến đấu |
| :-: | :--- | :-: | :--- | :---: | :---: | :-: | :--- |
| 1 | **`DEAL_OPENING`** | `sfx` | **Recipe (`room`):** `paper/card` với `events: {"count": 4, "gap": 0.14, "faster": 0.08, "softer": 1.5, "loose": 0.15}` + `swipe/cloth` (`at: 0`, `gain: -9`, `lowpass: 3500`) | `650–850` | `-15` | `0` | Loạt chia 4 lá bài đầu ván dứt khoát trên mặt bàn gỗ. |
| 2 | **`DEAL`** | `sfx` | **Single / Recipe (`dry`):** `paper/card` (`cut: [0, 0.28]`, `lowpass: 6500`) hoặc `slide/paper` (`gain: -6`) + `flick/thin` (`gain: -3`) | `180–300` | `-16` | `0` | Rút 1 lá nhanh gọn, rõ tiếng giấy trượt; `cooldownMs: 65`, `pitchJitter: 0.035`. |
| 3 | **`SHUFFLE`** | `sfx` | **Single / Recipe (`room`):** `cards/shuffle` (`lowpass: 6800`, `fade_out: 0.12`) + `book/place` (`at: 1.10`, `pitch: +2`, `gain: -7`) | `1100–1450` | `-15` | `0` | Tiếng xào bài thật rồi đặt gọn chồng bài xuống bàn. |
| 4 | **`CARD_PLAY`** | `sfx` | **Recipe (`dry`):** `paper/card` (`cut: [0, 0.22]`, `gain: -2`) + `knock/table` (`pitch: -3`, `at: 0.03`, `cut: [0, 0.14]`, `lowpass: 2400`, `gain: -4`) | `180–280` | `-15` | `0` | Quăng lá bài dày chạm mặt bàn gỗ mun; `cooldownMs: 65`, `pitchJitter: 0.035`. |
| 5 | **`SAT`** | `sfx` | **Recipe (`room`):** `sword/swing` (`pitch: -1`, `gain: 0`) + `whoosh/blade` (`at: 0.02`, `gain: -3`) + `shine/blade` (`at: 0.04`, `lowpass: 7200`, `gain: -6`) | `360–520` | `-14` | `0` | Vung đao thép rèn xé gió sắc lẹm; `cooldownMs: 85`, `pitchJitter: 0.035`. |
| 6 | **`THIEM`** | `sfx` | **Recipe (`dry`):** `whoosh/cloth` (`pitch: +3`, `gain: 0`) + `flick/thin` (`at: 0.02`, `gain: -4`) + `whoosh/fast` (`pitch: +2`, `highpass: 600`, `lowpass: 6500`, `gain: -6`) | `260–400` | `-14` | `0` | Né đòn áo bào tung gió lướt nhẹ, đối lập rõ với tiếng thép của `SAT`. |
| 7 | **`WEAPON`** | `sfx` | **Recipe (`room`):** `sword/draw` (`cut: [0, 0.65]`, `lowpass: 7800`, `gain: 0`) + `shine/blade` (`at: 0.12`, `gain: -4`) + `knock/wood` (`at: 0.02`, `gain: -8`) | `550–750` | `-14` | `0` | Rút trường kiếm ra khỏi vỏ gỗ/kim loại sắc bén. |
| 8 | **`ARMOR`** | `sfx` | **Recipe (`room`):** `leather/grab` (`gain: -2`) + `shield/block` (`at: 0.08`, `pitch: -3`, `lowpass: 4200`, `gain: 0`) + `thump/book` (`at: 0.10`, `gain: -5`) | `500–700` | `-14` | `0` | Khoác giáp da & tấm sắt nặng chắc chắn. |
| 9 | **`MOUNT_PLUS`** | `sfx` | **Recipe (`room`):** `horse/trot` (`cut: [0, 0.72]`, `pitch: -1`, `lowpass: 4500`, `gain: 0`, `fade_out: 0.15`) + `leather/grab` (`at: 0.04`, `gain: -6`) | `600–780` | `-14` | `0` | Ngựa phòng thủ (+1): nhịp vó điềm tĩnh, chắc nhịp hơn, không hí chói. |
| 10 | **`MOUNT_MINUS`** | `sfx` | **Recipe (`room`):** `horse/trot` (`cut: [0, 0.68]`, `pitch: +3`, `gain: 0`, `fade_out: 0.12`) + `horse/neigh` (`cut: [0, 0.55]`, `pitch: +1`, `at: 0.05`, `lowpass: 5200`, `gain: -7`, `fade_out: 0.15`) | `600–780` | `-14` | `0` | Ngựa tấn công (-1): nhịp vó dồn dập xung phong + tiếng ngựa hí ngắn phân biệt hẳn `+1`. |
| 11 | **`JUDGE`** | `sfx` | **Recipe (`room`):** `paper/page` (`cut: [0, 0.25]`, `gain: -2`) + `gavel/strike` (`at: 0.08`, `pitch: -2`, `gain: 0`) + `note/singing_bowl` (`at: 0.09`, `pitch: +5` → `D4`, `dur: 0.60`, `gain: -6`) | `620–820` | `-14` | `500` | Lật thẻ Phán xét + gõ thẻ lệnh + ngân đồng định đoạt số phận. |
| 12 | **`HERO_SKILL`** | `sfx` | **Recipe (`room`):** `whoosh/cloth` (`pitch: +1`, `gain: -2`) + `note/koto` (`pitch: +7` → `A4`, `at: 0.04`, `dur: 0.50`, `gain: -2`) + `note/koto` (`pitch: +12` → `D5`, `at: 0.12`, `dur: 0.55`, `gain: 0`) + `tom/high` (`at: 0.03`, `gain: -6`) | `550–750` | `-14` | `0` | Phất tay áo + gảy 2 nốt đàn tranh hào khí danh tướng + trống điểm. |
| 13 | **`TABLE_SKILL`** | `sfx` | **Recipe (`hall`):** `kick/deep` (`at: 0`, `gain: 0`) + `whoosh/deep` (`cut: [0, 0.85]`, `gain: -3`) + `bow/shot` (`at: 0.12`, `events: {"count": 3, "gap": 0.09, "loose": 0.2}`, `gain: -3`) + `crash/dark` (`at: 0.15`, `dur: 0.95`, `lowpass: 6500`, `gain: -7`) | `900–1250` | `-12` | `750` | Nam Man / Vạn Tiễn / Đào Viên: trống lớn toàn bàn + loạt dây cung phóng tiễn + chũm chọe trầm. |
| 14 | **`NULLIFICATION`** | `sfx` | **Recipe (`room`):** `sword/swing` (`pitch: +3`, `gain: -2`) + `glass/tap` (`pitch: -4`, `at: 0.03`, `gain: 0`) + `note/crotales` (`pitch: -10` → `D6`, `at: 0.04`, `dur: 0.65`, `gain: -3`) + `boom/short` (`at: 0.04`, `lowpass: 220`, `gain: -4`) | `650–850` | `-12` | `700` | Vô Giải Khả Kích: chém gió chặn chiêu + ấn ngọc đanh lạnh phản chế sắc sảo. |
| 15 | **`DUEL`** | `sfx` | **Recipe (`hall`):** `tom/mid` (`at: 0`, `gain: 0`) + `tom/high` (`at: 0.18`, `gain: 0`) + `clash/sword` (`at: 0.06`, `gain: -1`) + `clash/sword` (`pitch: +3`, `at: 0.26`, `gain: -2`) + `kick/deep` (`at: 0.18`, `gain: -2`) | `780–1050` | `-12` | `850` | Quyết Đấu: trống đôi xung trận + 2 nhát binh khí thép va nhau tóe lửa. |
| 16 | **`STEAL_DISMANTLE`** | `sfx` | **Recipe (`dry`):** `flick/paper` (`cut: [0, 0.30]`, `gain: 0`) + `whoosh/fast` (`pitch: +4`, `at: 0.03`, `gain: -3`) + `paper/rip` (`cut: [0, 0.22]`, `at: 0.10`, `lowpass: 5200`, `gain: -6`) | `360–520` | `-14` | `0` | Thuận Thủ / Quá Hà: rút giật bài nhanh + tiếng gió vút qua tay. |
| 17 | **`LIGHTNING`** | `sfx` | **Recipe (`hall`):** `thunder/crack` (`cut: [0, 1.55]`, `gain: 0`, `fade_out: 0.35`) + `thunder/roll` (`cut: [0, 1.55]`, `at: 0.12`, `lowpass: 450`, `gain: -3`, `fade_out: 0.45`) + `kick/deep` (`at: 0.02`, `gain: -2`) | `1400–1750` | `-12` | `1100` | Thiểm Điện: tia sét thật xé trời + sấm rền rung chuyển bàn đấu. |
| 18 | **`CONTROL_SCROLL`** | `sfx` | **Recipe (`room`):** `book/shut` (`pitch: -4`, `gain: 0`) + `note/tubular_bell` (`pitch: -10` → `D4`, `at: 0.04`, `dur: 0.78`, `lowpass: 2800`, `gain: -3`) + `note/singing_bowl` (`pitch: -7` → `D3`, `at: 0.06`, `dur: 0.80`, `gain: -6`) | `750–950` | `-14` | `550` | Lạc Bất Tư Thục: sập quyển sách/ấn gỗ + chuông đồng trầm khóa chặt pha đánh. |
| 19 | **`TURN_START`** | `alert` | **Recipe (`room`):** `tom/mid` (`pitch: -2`, `gain: 0`) + `kick/punch` (`at: 0.01`, `gain: -3`) + `note/koto` (`pitch: +7` → `A4`, `at: 0.04`, `dur: 0.42`, `gain: -6`) | `420–600` | `-14` | `0` | Tiếng trống quân báo đến lượt bạn kết hợp 1 nốt đàn tranh dẫn nhập. |
| 20 | **`ACTION_PROMPT`** | `alert` | **Recipe (`room`):** `note/crotales` (`pitch: -3` → `A6`, `at: 0`, `dur: 0.35`, `gain: -2`) + `clave/click` (`pitch: -3`, `at: 0.01`, `gain: -5`) + `note/crotales` (`pitch: -10` → `D6`, `at: 0.13`, `dur: 0.45`, `gain: -3`) | `450–650` | `-14` | `0` | Chuông ngọc 2 tiếng thanh nhẹ (không chói) nhắc cần phản ứng Thiểm / Vô Giải. |
| 21 | **`DAMAGE`** | `sfx` | **Recipe (`room`):** `sword/cut` (`cut: [0, 0.45]`, `gain: 0`) + `hit/punch` (`at: 0.02`, `gain: -1`) + `hit/metal` (`at: 0.03`, `cut: [0, 0.35]`, `lowpass: 4500`, `gain: -6`) + `boom/short` (`at: 0.02`, `gain: -4`) | `400–600` | `-13` | `0` | Chém trúng da thịt/giáp + lực va đấm trầm nặng; `cooldownMs: 80`, `pitchJitter: 0.04`. |
| 22 | **`ELIMINATION`** | `sfx` | **Recipe (`hall`):** `boom/wide` (`dur: 1.55`, `gain: 0`, `fade_out: 0.45`) + `land/heavy` (`at: 0.04`, `gain: -2`) + `crash/dark` (`at: 0.05`, `dur: 1.45`, `lowpass: 5200`, `gain: -6`) + `note/tubular_bell` (`pitch: -15` → `A3`, `at: 0.08`, `dur: 1.45`, `gain: -6`) | `1400–1750` | `-12` | `1150` | Trống tử trận + thân ngã nặng + chiêng đồng & chuông tang ngân sâu, hạ nhạc nền mạnh. |

---

## 5. Hướng Dẫn Kỹ Thuật Cho `sfx-ui-room`, `sfx-combat` & `audio-integrator`

1. **Cách render nhanh bằng Python API (`C:\Users\kyuu4\.earshot-venv\Scripts\python.exe`):**
   - Dùng `from earshot.make import make` trong 1 script Python thay vì gọi CLI `earshot.exe` 38 lần (tránh khởi động lại process 38 lần).
   - Truyền `lufs=-16` / `-14` / `-12` tùy theo bảng mục 4; với các cue quá dài do reverb `"hall"` / `"room"`, đặt `"dur"` + `"fade_out"` trong recipe JSON và hậu kiểm bằng script Python QA (`soundfile` + `numpy`).
2. **Tiêu chuẩn hậu kiểm Python QA (bắt buộc cho cả 38 file `.wav`):**
   - Định dạng: PCM 16-bit hoặc 24-bit WAV (`48000 Hz`, mono/stereo đồng bộ).
   - **Leading silence:** Trim phần tĩnh đầu sao cho trước onset vượt `-40 dB` chỉ còn `<= 5 ms` (tối đa `< 10 ms`) + fade-in `2 ms` chống click.
   - **Peak & Clipping:** True/sample peak `<= 0.891` (`-1.0 dBFS`).
   - **Tail:** Fade-out mượt `25–120 ms` ở cuối file, phần đuôi im lặng thừa (`< -60 dB`) cắt gọn theo đúng khung `Target Dur (ms)` ở bảng mục 4.
   - **Kiểm định LUFS / RMS:** Dùng `earshot.measure` (hoặc `soundfile` + `pyloudnorm` / `earshot measure`) để xác nhận UI (`-16 LUFS` ±1.5) êm hơn Combat (`-14 LUFS` ±1.5) và Cao trào (`-12 LUFS` ±1.5).
3. **Hướng dẫn riêng cho `audio-integrator` (nối `climax` layer):**
   - Trong `demoAudioEngine.ts`, khi `soundPack === 'v2'` và `musicMode === 'climax'`, thay các tiếng trống `scheduleDrumHit` / `scheduleFilteredNoise` thô bằng buffer đã giải mã từ `audio-v2` (ví dụ `TURN_START` cắt/lowpass nhẹ ở ~140 Hz cho trống nhịp 0 & 4, `TIMER_TICK` giảm gain cho mõ nhịp 3 & 6) để 100% chế độ `v2` không còn oscillator thô.
