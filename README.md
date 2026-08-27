# Tak tudy! (APP-001)

> **Motto:** „Plánuji, abych měla svobodu.“  
> **Verze:** v1.0.0 (MVP)  
> **Referenční specifikace:** Business zadání v1.2, Funkční prototyp v0.3, Vizuální design v0.2 Outdoor

---

## 🌲 O aplikaci

*Tak tudy!* spojuje plánování cest, dominantní mapu, etapový itinerář, body zájmu (POI), časově kritické události, offline spolehlivost a terénní svobodu do jednoho uceleného pracovního prostoru.

### Hlavní funkce
* **Dominantní mapa s fotografickými body (MapLibre GL):**
  * Vektorový podklad šetrný k outdoorovému použití (světlý denní a tmavý noční režim).
  * Vizuální značky bodů s fotografií, kategorií a nepřehlédnutelným červeným prstencem ★ TOP.
  * Zobrazení trasy s kontrastním lemováním.
* **Hierarchie cesty:** Cesta $\rightarrow$ Etapa $\rightarrow$ Den $\rightarrow$ Dílčí trasa $\rightarrow$ Body zájmu.
* **Režim „Dnes“:** Okamžitý přehled dnešních zastávek s odpočtem k pevným časům (vlaky, rezervace).
* **„Co mám poblíž?“:** Klient-side výpočet vzdáleností k nenavštíveným místům s ohledem na soukromí (poloha se neposílá na server).
* **Offline-First architektura:** Kompletní stažení itineráře, bodů a mapy před cestou („Připraveno. Můžeš vyrazit.“).
* **Bezpečné sdílení:** Izolovaný 128-bit unguessable odkaz / QR kód pro zobrazení jedné cesty v read-only režimu bez nutnosti registrace příjemce.
* **Import míst:** Rychlé uložení („Uložit teď, doplnit později“) a SSRF-safe parser informací z URL.

---

## 🛠 Technologický stack

* **Frontend:** React 18, TypeScript, Tailwind CSS (paleta Outdoor v0.2), MapLibre GL, Lucide Icons, Dexie.js (IndexedDB).
* **Mobilní kontejner:** Capacitor.js pro iPhone 12 mini (iOS) a Android.
* **Backend:** Node.js v20+ / Fastify, JWT autentizace, Zod validace schémat.
* **Databáze:** SQLite (vestavěná `node:sqlite`) s transakcemi a relační integritou; připraveno pro PostgreSQL/PostGIS.
* **Bezpečnost:** SSRF ochrana při scrapingu, BOLA/IDOR ochrana na úrovni SQL dotazů, rate limiting.

---

## 🚀 Spuštění lokálního vývoje a Preview

```bash
# 1. Spuštění Fastify API backendu (port 3001)
npm run dev:server

# 2. Spuštění Vite frontendu (port 5173 s proxy na /api)
npm run dev:client

# Nebo obojí současně:
npm run dev
```

* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:3001](http://localhost:3001)
* **Předpřipravený Demo účet:**
  * E-mail: `demo@taktudy.app`
  * Heslo: `heslo123`

---

## 🧪 Testy

```bash
# Spuštění kompletní testovací sady (Vitest)
npm test
```

---

## ☁️ Produkční nasazení (Render.com / Cloud)

Aplikace je plně připravena pro nasazení do cloudu jako jednotný servis (backend servíruje API i frontend):

1. Vytvořte repozitář na **[GitHub.com](https://github.com)** a nahrajte projekt (`git push`).
2. Přihlaste se na **[Render.com](https://render.com)**.
3. Klikněte na **New +** $\rightarrow$ **Blueprint** (nebo **Web Service**) a vyberte repozitář `taktudy`.
4. Render automaticky načte konfiguraci ze souboru `render.yaml` a spustí aplikaci na bezpečné HTTPS adrese (např. `https://taktudy.onrender.com`).
