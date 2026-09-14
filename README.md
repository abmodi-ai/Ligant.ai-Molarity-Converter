# Molarity Converter for Biologics

Converts between mass concentration (mg/mL, µg/mL, g/L, ...) and molar
concentration (M, mM, µM, nM, pM) for a protein or antibody, given its
molecular weight, its source, and what that weight is the mass of.

Free, open source, and built by [Ligant](https://ligant.ai) for biologics
researchers. It runs entirely in your browser: nothing you enter ever
leaves your computer.

Live at
**[benchtools.ligant.ai/molarity-converter](https://benchtools.ligant.ai/molarity-converter/)**.

## Running it locally

```sh
git clone https://github.com/abmodi-ai/Ligant.ai-Molarity-Converter.git
cd Ligant.ai-Molarity-Converter
npm install
npm run dev
```

Then open the address it prints (usually `http://localhost:5173`) in your
browser.

To build a static copy instead of running the dev server:

```sh
npm run build
npm run preview   # serves the build at a local address
```

The build output is a `dist/` folder you can host on any static file server.

---

Free and open source under the [Apache License 2.0](LICENSE). Built by
[Ligant AI Incorporated](https://ligant.ai).
