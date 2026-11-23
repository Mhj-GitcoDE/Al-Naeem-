# Al Naeem Stock Count

24K bullion stock count for **Al Naeem Jewellery L.L.C.**: Head Office (HO) and Branch (BR).

- Three tables: **Fortuna PAMP Bars**, **Local Bars** and **Local Coins**. You can add or remove sizes.
- Type HO and BR pieces. Total pieces and grams update straight away. The grams are worked out exactly, so 15.55 g × 3 = 46.65 g with no rounding errors.
- **Paste staff message**: paste a WhatsApp count and the HO or BR column fills itself. You see a preview first, any line it couldn't read is shown in red, and it checks the total.
- **Share** buttons: one table, or the full report, as an image, plus a **PDF**. Both go straight to WhatsApp.
- **Staff mode** for the shop Android phones: staff count their own shop and tap **Send count on WhatsApp**.
- **PIN lock**.
- Works **offline** and needs no Claude, no account and no server. All numbers stay on the phone.

---

## 1. Put it on GitHub (one time, about 5 minutes, easiest on a computer)

1. Sign in at **github.com** and choose **New repository**.
   - Name: `stock-count` (or any name you like)
   - Set it to **Public**. GitHub Pages is free only for public repositories. Only the empty app is public. Your counts are never uploaded.
   - Click **Create repository**.
2. On the new repository page click **uploading an existing file**.
   Drag in **everything from this folder**, including the `icons` folder, then click **Commit changes**.
3. Go to **Settings → Pages**.
   Under *Build and deployment* choose **Deploy from a branch**, Branch **main**, folder **/ (root)**, then click **Save**.
4. After about 1 minute the page shows your link, for example:
   `https://YOUR-USERNAME.github.io/stock-count/`

## 2. Install it on the phones

**iPhone (Safari only):**
1. Open the link in **Safari**.
2. Tap **Share** (the square with an arrow), then **Add to Home Screen**, then **Add**.
3. Open it from the blue diamond icon on your home screen.

**Android (Chrome):**
1. Open the link in **Chrome**.
2. Tap **⋮**, then **Install app** (or **Add to Home screen**).
3. Open it from the new icon.

Open it once while online. After that it works without internet.

## 3. Set up each phone

Tap the **gear** (Settings):

| Phone | "This phone is used by" | Other settings |
|---|---|---|
| Your iPhone | **Owner** | **Set a 4-digit PIN** (recommended) |
| HO shop Android | **HO staff** | Owner's WhatsApp number, e.g. `9715XXXXXXXX` |
| BR shop Android | **BR staff** | Owner's WhatsApp number |

If a staff phone has your number, **Send count on WhatsApp** opens your chat directly with the message ready.

## 4. Weekly routine

1. Staff type their pieces on their phone and tap **Send count on WhatsApp**.
2. On your iPhone, copy their message, open the app and tap **Paste staff message**, then **Paste**.
3. Check the preview:
   - **green**: the total matches.
   - **red**: the total doesn't match, or a line couldn't be read. Nothing is guessed.
4. Tap **Fill HO column** or **Fill BR column**. The filled boxes flash yellow.
5. Tap **Share report**, **Save PDF** or **Share** on a single table, then **Share to WhatsApp** and choose your uncle.
6. Next week, tap **New count** to set everything back to 0. Your sizes stay as they are.

### Messages the paste understands

The staff app's own message always works. Hand-typed messages work too, for example:

```
Branch
pamp
1g - 24
2,5 gm = 12
10gm 20 pcs
half oz 4
1 oz: 8
local bars
10g 12
coins
8g: 10
pamp 10g HO 5 BR 3
Total 99
```

Headings such as `pamp`, `pump`, `fortuna`, `local bars` and `coins` tell it which table the lines below belong to. `HO`, `Head office` or `Main`, and `BR` or `Branch`, tell it the shop. If the shop isn't in the message, it asks you.

## Good to know

- **Your data lives only on that phone**, inside the app. Deleting the app, or clearing Safari/Chrome website data, erases the counts.
- **The PIN** is asked for when the app opens and after it has been in the background for 1 minute. It stops casual looking, but it isn't bank-level security. If you forget it, the only way back in is **Erase everything**.
- **Updating the app:** upload the changed files to the same GitHub repository. Phones pick up the new version the next time the app is opened while online (sometimes it takes a second opening).
- **Testing on a computer:** open the GitHub link in Chrome. Opening `index.html` straight from a folder works too, but without offline mode.
