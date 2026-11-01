# Chùa · tuvi.terranimus.com/chua/

The web temple **Chánh Điện Online** by **Kent Juno**, served by Terranimus as a tab of Tử Vi at
<https://tuvi.terranimus.com/chua/> ("Chùa" in Tử Vi's top bar). It has no hostname of its own: the first address,
`chua.terranimus.com`, was removed by the owner on 2 Nov 2026 and the deploy script removes any custom domain it finds.

**Free, always.** The owner, 2 Nov 2026: the temple never charges. No payment, donation, bank account or "coin" is ever
shown on the page or in this repository. This repository is a fork of
[kentjuno/chanh-dien-online](https://github.com/kentjuno/chanh-dien-online) (MIT, `LICENSE` kept unchanged). Credit
to the author stays on the page ("Thực hiện bởi Kent Juno", linked to the original repository).

## What is published, and what is not

| Path | Published | Why |
|---|---|---|
| `index.html` | yes | the temple page. Changes from upstream: the credit links to the original repository; a line says the page does not represent any temple or religious organisation; the offering buttons carry no "coin" amounts, the merit board shows names only, and the entry text says the offerings are free; `og:image` is absolute |
| `assets/` | yes | images (made with Google Flow) and music (made with Gemini), per the upstream README |
| `live/` | **never** | the TikTok LIVE kit: a Node server meant to run on the streamer's own machine, bound to 127.0.0.1. It is not uploaded, so `https://tuvi.terranimus.com/chua/live/*` answers 404 |
| everything else | no | `scripts/chua-deploy.mjs` uploads an allow-list (index.html + assets/ media files) and refuses unknown file types |

`_headers` is upstream's Cloudflare Pages file; it is not used here (the Worker sets the headers).

## How it is hosted

A Cloudflare Worker named `chua` on the Terranimus Cloudflare account, with **Workers static assets**. It holds two
Worker routes on Tử Vi's name, `tuvi.terranimus.com/chua` and `tuvi.terranimus.com/chua/*`; they are more specific than
Tử Vi's own `tuvi.terranimus.com/*`, so every other Tử Vi path never reaches it. The Tử Vi app's code is not involved; its top bar links to
`/chua/`. `ops/chua.worker.mjs` answers GET/HEAD only and adds:

- `Content-Security-Policy`: `default-src 'none'`; the page's inline script and two style blocks are allowed **by
  sha256 hash** only (computed at deploy, no `unsafe-inline`); fonts from Google Fonts; images, audio from self;
  `frame-ancestors 'none'`, `form-action 'none'`, `base-uri 'none'`.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (no camera, microphone, location, payment),
  `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`.
- Cache: the page `max-age=0, must-revalidate`; `assets/*` one day fresh, then `stale-while-revalidate` for a week
  (file names are not content-hashed).
- `/chua/health/ready` → `{"service":"terranimus-chua","commit":"<sha>"}`.

What the page talks to: only itself and Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). No analytics,
no trackers, no API calls. The visitor's dharma name is kept in their own browser (`localStorage`) and never sent.
Speech uses the browser's own Vietnamese voice when one is installed.

## Redeploy

Credentials come only from the vault (record `Terranimus Cloudflare`, action `deploy`; manifest
`chua/production`, see `vault-manifest.json`). Never use wrangler for this Worker.

```bash
node scripts/vault-sync.mjs pull --action deploy
node scripts/chua-deploy.mjs --dry-run    # lists the files and the CSP, touches nothing
node scripts/chua-deploy.mjs              # commit first: refuses a dirty tree
```

The script gates on the vault, uploads the assets and the Worker through the Cloudflare API, removes any custom
domain of the Worker and keeps the two routes on Tử Vi's name
(refusing a route held by another script), then checks live: health names this commit, the page carries the CSP and
HSTS, `/chua` redirects to `/chua/`, `/chua/live/*`, `/chua/README.md`, `/chua/.git/config` and the scripts answer 404,
and Tử Vi's own `/health/ready` still answers from Tử Vi.

If you change `index.html`, just redeploy: the CSP hashes are recomputed from the file. An external `<script src>` or
an inline `on…=` handler makes the deploy refuse until it is reviewed.

**Taking it down:** delete the two routes `tuvi.terranimus.com/chua*` first (then `/chua` falls through to Tử Vi), then
the Worker `chua`. Nothing else uses them.

## Pulling upstream changes

```bash
git remote add upstream https://github.com/kentjuno/chanh-dien-online.git   # once
git fetch upstream && git merge upstream/main
```

Read the diff of `index.html` and `assets/` before redeploying (any new network call, script or donation text).

## Notes on the upstream code

- The block commented "lantern ambience" at the end of the page script is obfuscated; decoded, it only paints the
  author's credit ("✦ Mã nguồn được chia sẻ bởi Kent Juno ✦") on the canvas for about seven seconds every five to ten
  minutes. It makes no network call. Kept as it is: it is the author's credit.
- Upstream's offering buttons imitate TikTok gifts with "coin" amounts. Here they are plain offerings (cánh sen, dâng
  hương, hoa sen, thỉnh chuông) with no amounts; the variable names inside the script still say `coins` (a weight for
  the effects and the board's order, never shown). There is no payment code.
- Upstream's README asks for support to the author's own bank account; that section is removed from the copy below
  (the owner, 2 Nov 2026). Anyone who wants to thank the author can find them through the original repository.
- Asset licences: images made with Google Flow, music with Gemini (upstream's statement). Accepted by the owner because
  the temple is free and never charges (2 Nov 2026).

---

# Upstream README (kentjuno/chanh-dien-online, support section removed)

# Chánh Điện Tịnh Tâm

Chánh điện online 2.5D cho TikTok LIVE. Mỗi người xem bình luận là bước vào chánh điện, ngồi xuống bồ đoàn tụng kinh. Ai tặng quà sẽ được xướng tên hồi hướng bằng giọng đọc tiếng Việt. Có nhạc thiền, chuông, mõ và đọc kinh định kỳ.

Mã nguồn chia sẻ miễn phí (MIT). Có hai phần:

| Thư mục | Là gì |
|---|---|
| `index.html`, `assets/` | Bản web tĩnh cho mọi người tự vào ngồi tụng (đăng lên Cloudflare Pages) |
| `live/` | Bộ công cụ phát LIVE: server Node, overlay 9:16, bảng điều khiển |

## Chạy bộ LIVE trên máy phát

Cần Node.js 20 trở lên.

```bash
cd live
npm install
npm start
```

1. Mở `http://localhost:3000/live/control.html` (bảng điều khiển).
2. Bấm **Mở màn hình overlay 9:16**, rồi bấm **Bật âm thanh** một lần trong cửa sổ đó (trình duyệt chặn tự phát tiếng).
3. Trong TikTok LIVE Studio: *Add source → Window capture* → chọn cửa sổ overlay. Với OBS thì dùng *Browser source* trỏ tới `http://localhost:3000/live/overlay.html`, kích thước 1080×1920.
4. Bật LIVE trên TikTok, nhập `@username` vào bảng điều khiển, bấm **Kết nối**.

Chưa live vẫn thử được: dùng **Thử tương tác**, **Đổ người mẫu 15/36/64/100** hoặc **Bot mô phỏng**.

### Người xem làm được gì

- **Bình luận bất kỳ**: được vào ngồi (tối đa 100 chỗ, chỗ ngồi tự mở rộng 24 → 36 → 64 → 100). Đầy chỗ thì người im lặng lâu nhất mà chưa tặng quà sẽ nhường chỗ.
- **Bình luận đúng một từ** `nam`, `nữ`, `sư`, `ni`, `tiểu`, `bà`, `cao tăng`: đổi hình nhân vật. Câu "Nam mô A Di Đà Phật" không bị hiểu nhầm thành "nam".
- **Tặng quà**: banner xướng tên, giọng đọc hồi hướng (lấy lời nguyện từ bình luận gần nhất của người đó nếu có), hiệu ứng theo giá trị quà, cộng điểm vào bảng Công Đức.
- **Thả tim**: tim bay trên đầu nhân vật.

## Bảo mật

Dự án được viết để ai tải về chạy cũng an toàn mặc định:

- **Không dùng tài khoản TikTok.** Server chỉ đọc sự kiện công khai của phòng live theo username. Không cần, không hỏi và không lưu mật khẩu, cookie hay session. Không gửi tin nhắn thay bạn.
- **Chỉ mở trên máy mình.** Server lắng nghe `127.0.0.1`, máy khác trong mạng hay Internet không truy cập được. Muốn mở ra ngoài phải tự đặt biến `HOST`. Không nên làm vậy khi chưa thêm đăng nhập.
- **Chặn trang web lạ điều khiển.** WebSocket chỉ nhận kết nối từ chính trang của server (kiểm tra `Origin`), và header `Host` phải là localhost (chống DNS rebinding). Một trang web khác đang mở trong cùng trình duyệt không gửi được lệnh. Cửa sổ overlay chỉ nhận dữ liệu, không gửi lệnh được.
- **File tĩnh có danh sách trắng.** Chỉ phục vụ `/assets` và `/live`. Chặn file ẩn (`.git`, `.env`), `node_modules`, mã server, `package.json` và mọi đường dẫn `../`.
- **Không tin dữ liệu vào.** Tên người xem, bình luận và tên quà đều bị cắt độ dài. Cài đặt chỉ nhận đúng khóa, đúng kiểu, trong giới hạn. Văn bản đưa vào giọng đọc được escape XML. Mọi chữ trên màn hình vẽ bằng `textContent` hoặc canvas, không chèn HTML, nên bình luận chứa mã độc chỉ hiện ra như chữ thường.
- **Chống spam.** Hàng đợi giọng đọc tối đa 15 câu. Bình luận thường không đọc thành tiếng.
- **Phụ thuộc ghim phiên bản** trong `live/package.json`: `ws`, `msedge-tts`, `tiktok-live-connector`. Không có khóa API nào trong mã.

Các lớp trên đã được thử: đường dẫn `../`, `%2e%2e`, `.git/config`, `server.mjs`, `package.json` đều trả 404. Host giả trả 421. WebSocket từ Origin lạ bị từ chối. Lệnh gửi từ overlay bị bỏ qua. Cài đặt sai kiểu bị kẹp về giới hạn.

### Lưu ý

- `tiktok-live-connector` là thư viện cộng đồng, không phải API chính thức của TikTok. Nó có thể ngừng chạy khi TikTok đổi hệ thống. Kiểm tra điều khoản TikTok trước khi dùng cho kênh của bạn.
- Giọng đọc dùng dịch vụ Read Aloud của Microsoft Edge qua mạng (giọng Nam Minh, Hoài My). Máy phát cần có Internet.
- Hình ảnh trong `assets/` được tạo bằng Google Flow, nhạc nền tạo bằng Gemini. Kiểm tra điều khoản của các dịch vụ đó trước khi dùng thương mại, hoặc thay bằng tài nguyên của bạn.

## Miễn trừ trách nhiệm

Dự án được chia sẻ **miễn phí, với mục đích học tập và tham khảo lập trình**. Phần mềm được cung cấp "nguyên trạng" (AS IS), không kèm bất kỳ bảo đảm nào, rõ ràng hay ngụ ý.

Khi tải về, sử dụng, chỉnh sửa hoặc phân phối lại mã nguồn này, **bạn tự chịu hoàn toàn trách nhiệm** về:

- Mọi nội dung bạn phát trên livestream hoặc đăng tải, bao gồm hình ảnh, âm thanh, giọng đọc, lời nguyện, bình luận được hiển thị.
- Việc nhận quà, donation hoặc bất kỳ khoản thu nào từ người xem.
- Việc tuân thủ điều khoản sử dụng của TikTok và các nền tảng, dịch vụ bên thứ ba khác (thư viện đọc sự kiện TikTok là thư viện cộng đồng, không chính thức).
- Việc tuân thủ pháp luật nơi bạn sinh sống và hoạt động, kể cả quy định về hoạt động tôn giáo, quảng cáo, thuế và bản quyền.
- Mọi rủi ro và thiệt hại phát sinh, trực tiếp hay gián tiếp, như bị khóa tài khoản, bị dừng live, mất dữ liệu, tranh chấp hay khiếu nại.

Tác giả **không liên quan, không bảo trợ và không chịu trách nhiệm** đối với bất kỳ kênh, tài khoản, sản phẩm hay hoạt động nào sử dụng mã nguồn này. Dự án không đại diện cho bất kỳ chùa, tu viện hay tổ chức tôn giáo nào. Khi dùng nội dung liên quan đến Phật giáo, xin giữ sự tôn kính và không dùng vào mục đích lừa đảo, trục lợi hay xúc phạm niềm tin của người khác.

Việc sử dụng mã nguồn đồng nghĩa với việc bạn đã đọc và đồng ý với các điều trên.

> **Disclaimer (EN):** This project is shared free of charge for educational purposes only and is provided "AS IS", without warranty of any kind. Anyone who uses, modifies or redistributes it is solely responsible for their own content, streams, donations, compliance with TikTok and other platforms' terms, and applicable laws. The author is not affiliated with, does not endorse, and accepts no liability for any channel, account, product or activity built with this code, nor for any direct or indirect damages.

## Giấy phép

MIT, xem `LICENSE`.
