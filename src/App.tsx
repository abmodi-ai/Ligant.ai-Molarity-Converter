import { useMemo, useState } from 'react'
import {
  MASS_BASIS,
  MASS_BASIS_LABEL,
  MASS_UNITS,
  MOLAR_UNITS,
  MW_PROVENANCE,
  MW_PROVENANCE_LABEL,
  MW_UNITS,
  UNIT_LABEL,
  type MassBasis,
  type MassUnit,
  type MolarUnit,
  type MwProvenance,
  type MwUnit,
} from './lib/units'
import type { Direction } from './lib/convert'
import { computeConversion, notebookLine } from './lib/compute'
import { CONSTANTS_REGISTER, UNDETECTABLE_FAILURES } from './lib/flags'
import { REPO_URL, TOOL_ID, TOOL_NAME, URS_VERSION } from './lib/site'

/**
 * The whole tool.
 *
 * C1-NF-03 requires the inputs and the result to fit one screen without
 * scrolling, so the converter is a two-column grid and the disclosures §9 and
 * §11 require at the tool's own address sit below it. Those disclosures are on
 * the page rather than in documentation (C1-FC-01, C1-CN-01) and are rendered
 * from the same constants the flag rules read, so the page cannot describe a
 * threshold the tool does not apply.
 *
 * C1-ST-02: nothing is persisted. There is no localStorage, no sessionStorage
 * and no URL state, so there is nothing that could survive a reload
 * invisibly. That is the strongest form of the requirement rather than a
 * shortcut past it — the alternative, persisting and marking it, adds a thing
 * to get wrong for a convenience nobody asked for.
 */
export function App() {
  const [direction, setDirection] = useState<Direction>('mass-to-molar')
  const [entered, setEntered] = useState('')
  const [mw, setMw] = useState('')
  const [provenance, setProvenance] = useState<MwProvenance | ''>('')
  const [massBasis, setMassBasis] = useState<MassBasis | ''>('')
  const [massUnit, setMassUnit] = useState<MassUnit>('mg/mL')
  const [molarUnit, setMolarUnit] = useState<MolarUnit>('uM')
  const [mwUnit, setMwUnit] = useState<MwUnit>('kDa')
  const [copied, setCopied] = useState(false)

  /**
   * C1-ST-03. Changing direction must not silently carry the molecular weight,
   * its source, or its mass basis. They are kept, because re-typing a weight to
   * convert the same protein the other way is exactly the friction the tool
   * exists to remove — and each is marked as retained until the user touches
   * it, which is what the requirement asks for instead of silence.
   */
  const [retained, setRetained] = useState(false)

  function changeDirection(next: Direction) {
    if (next === direction) return
    setDirection(next)
    // The entered concentration is cleared rather than retained: its unit
    // changes meaning across the swap, and a number that silently becomes a
    // molar quantity because the direction moved is the paste defect again.
    setEntered('')
    setCopied(false)
    if (mw.trim() !== '' || provenance !== '' || massBasis !== '') setRetained(true)
  }

  const clearRetained = () => setRetained(false)

  const outcome = useMemo(() => {
    // Nothing is computed until every declaration is present. C1-MW-01: no
    // conversion completes without a molecular weight, and C1-MW-04/07 make the
    // two declarations required rather than optional.
    if (entered.trim() === '' || mw.trim() === '' || provenance === '' || massBasis === '') return null
    return computeConversion({
      direction,
      enteredValue: Number(entered),
      mwValue: Number(mw),
      provenance,
      massBasis,
      units: { mass: massUnit, molar: molarUnit, mw: mwUnit },
    })
  }, [direction, entered, mw, provenance, massBasis, massUnit, molarUnit, mwUnit])

  const enteredUnit = direction === 'mass-to-molar' ? massUnit : molarUnit
  const result = outcome && outcome.ok ? outcome : null
  const rejections = outcome && !outcome.ok ? outcome.rejections : null

  return (
    <>
      <a className="skip" href="#result">Skip to result</a>
      <div className="wrap">
        <header className="masthead">
          <h1>{TOOL_NAME}</h1>
          <span className="tag">{TOOL_ID} · URS v{URS_VERSION}</span>
          <p>
            One conversion, for a protein whose molecular weight you declare along with its source and
            what that weight is the mass of. This tool does not supply molecular weights.
          </p>
        </header>

        <main className="converter">
          <section className="panel" aria-labelledby="inputs-h">
            <h2 id="inputs-h">Inputs</h2>

            {/* C1-CV-02. Selected before data entry; not a mode. */}
            <fieldset className="field">
              <legend>Convert</legend>
              <div className="directions" role="group" aria-label="Conversion direction">
                <button
                  type="button"
                  aria-pressed={direction === 'mass-to-molar'}
                  onClick={() => changeDirection('mass-to-molar')}
                >
                  mass → molar
                </button>
                <button
                  type="button"
                  aria-pressed={direction === 'molar-to-mass'}
                  onClick={() => changeDirection('molar-to-mass')}
                >
                  molar → mass
                </button>
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="entered">
                {direction === 'mass-to-molar' ? 'Mass concentration' : 'Molar concentration'}
              </label>
              <div className="row">
                <input
                  id="entered"
                  type="text"
                  inputMode="decimal"
                  value={entered}
                  autoComplete="off"
                  className={rejections?.some((r) => r.code === 'C1-HI-02') ? 'bad' : undefined}
                  onChange={(e) => {
                    setEntered(e.target.value)
                    setCopied(false)
                  }}
                />
                {direction === 'mass-to-molar' ? (
                  <select
                    aria-label="Mass concentration unit"
                    value={massUnit}
                    onChange={(e) => setMassUnit(e.target.value as MassUnit)}
                  >
                    {MASS_UNITS.map((u) => (
                      <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    aria-label="Molar concentration unit"
                    value={molarUnit}
                    onChange={(e) => setMolarUnit(e.target.value as MolarUnit)}
                  >
                    {MOLAR_UNITS.map((u) => (
                      <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* C1-MW-01/02/03. Required, never inferred, unit always explicit. */}
            <div className="field">
              <label htmlFor="mw">
                Molecular weight
                {retained && <span className="retained">retained — confirm</span>}
              </label>
              <div className="row">
                <input
                  id="mw"
                  type="text"
                  inputMode="decimal"
                  value={mw}
                  autoComplete="off"
                  className={rejections?.some((r) => r.code === 'C1-HI-01') ? 'bad' : undefined}
                  onChange={(e) => {
                    setMw(e.target.value)
                    clearRetained()
                    setCopied(false)
                  }}
                />
                <select
                  aria-label="Molecular weight unit"
                  value={mwUnit}
                  onChange={(e) => {
                    setMwUnit(e.target.value as MwUnit)
                    clearRetained()
                  }}
                >
                  {MW_UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                  ))}
                </select>
              </div>
              <p className="hint">
                Required. The tool does not supply, look up, or suggest molecular weights — not for
                common antibodies either.
              </p>
            </div>

            {/* C1-MW-04/05. "Not recorded" is a value, not a blank. */}
            <div className="field">
              <label htmlFor="prov">
                Source of that weight
                {retained && <span className="retained">retained — confirm</span>}
              </label>
              <select
                id="prov"
                value={provenance}
                onChange={(e) => {
                  setProvenance(e.target.value as MwProvenance)
                  clearRetained()
                }}
              >
                <option value="" disabled>— select —</option>
                {MW_PROVENANCE.map((p) => (
                  <option key={p} value={p}>{MW_PROVENANCE_LABEL[p]}</option>
                ))}
              </select>
            </div>

            {/*
              C1-MW-07/08. Single-select, and radios rather than a dropdown.

              The options are not strictly exclusive in the abstract — a
              PE-conjugated scFv is both single-chain and conjugated — and §3.3
              resolves that by carrying the precedence rule inside the conjugate
              option's own label. A <select> truncates its options to the width
              of the control, which hides exactly the clause the rule depends on,
              and the URS is explicit that without it two people in the same lab
              answer differently for the same reagent. Radios show every label in
              full.
            */}
            <fieldset className="field">
              <legend>
                The stated weight is the mass of
                {retained && <span className="retained">retained — confirm</span>}
              </legend>
              <div className="basis-options">
                {MASS_BASIS.map((b) => (
                  <label key={b}>
                    <input
                      type="radio"
                      name="massBasis"
                      value={b}
                      checked={massBasis === b}
                      onChange={() => {
                        setMassBasis(b)
                        clearRetained()
                        setCopied(false)
                      }}
                    />
                    <span>{MASS_BASIS_LABEL[b]}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="outunit">
                Report the result in
              </label>
              {direction === 'mass-to-molar' ? (
                <select id="outunit" value={molarUnit} onChange={(e) => setMolarUnit(e.target.value as MolarUnit)}>
                  {MOLAR_UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                  ))}
                </select>
              ) : (
                <select id="outunit" value={massUnit} onChange={(e) => setMassUnit(e.target.value as MassUnit)}>
                  {MASS_UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                  ))}
                </select>
              )}
              <p className="hint">Input and output units are chosen independently; neither implies the other.</p>
            </div>
          </section>

          <section className="panel" aria-labelledby="result-h" id="result">
            <h2 id="result-h">Result</h2>

            {rejections && rejections.map((r) => (
              <p className="rejection" key={r.code}>
                <code>{r.code}</code>
                {r.message}
              </p>
            ))}

            {!outcome && (
              <p className="awaiting">
                Enter a concentration and declare a molecular weight, its source, and what it is the
                mass of. All four are required.
              </p>
            )}

            {result && (
              <>
                <p className="result-value">
                  {direction === 'mass-to-molar' ? result.displayed.molar : result.displayed.mass}
                  <span className="unit">
                    {UNIT_LABEL[direction === 'mass-to-molar' ? molarUnit : massUnit]}
                  </span>
                </p>
                <p className="result-from">
                  from {entered} {UNIT_LABEL[enteredUnit]}
                </p>

                <dl className="derivation">
                  <div>
                    <dt>Relation</dt>
                    <dd>{result.relation}</dd>
                  </div>
                  <div>
                    <dt>Molecular weight</dt>
                    <dd>{result.declarations.mwValue} {UNIT_LABEL[mwUnit]}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{MW_PROVENANCE_LABEL[result.declarations.provenance]}</dd>
                  </div>
                  <div>
                    <dt>Mass of</dt>
                    <dd>{MASS_BASIS_LABEL[result.declarations.massBasis]}</dd>
                  </div>
                  <div>
                    <dt>Assumptions</dt>
                    <dd>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {result.assumptions.map((a) => <li key={a}>{a}</li>)}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt>Engine</dt>
                    <dd>{result.engineVersion}</dd>
                  </div>
                </dl>

                {result.flags.length === 0 ? (
                  <p className="no-flags">No flags raised.</p>
                ) : (
                  result.flags.map((f) => (
                    <p className="flag" key={f.code}>
                      <code>{f.code}</code>
                      {f.message}
                    </p>
                  ))
                )}

                <div className="statements">
                  {/*
                    Said where the confusion happens rather than in a footnote: a
                    result one ULP below a threshold is flagged and displays
                    identically to one exactly on it.
                  */}
                  {result.flags.some((f) => f.kind === 'threshold') && (
                    <p>{result.statements.thresholdEvaluation}</p>
                  )}
                  <p>{result.statements.precision}</p>
                  <p>{result.statements.moleculesNotSites}</p>
                  <p><strong>{result.statements.scope}</strong></p>
                </div>

                <button
                  className="copy"
                  type="button"
                  onClick={() => {
                    // C1-OUT-09, and C1-ST-01: the line carries the declarations
                    // and every flag. A value cannot be taken from here stripped
                    // of them.
                    void navigator.clipboard?.writeText(notebookLine(result))
                    setCopied(true)
                  }}
                >
                  {copied ? 'Copied' : 'Copy for lab notebook'}
                </button>
              </>
            )}
          </section>
        </main>

        <div className="disclosure">
          {/* §9 / C1-FC-01. Required on the tool's own page, visible to the user. */}
          <section className="panel" aria-labelledby="cannot-h">
            <h2 id="cannot-h">What this tool cannot detect</h2>
            <p style={{ marginTop: 0 }}>
              The tool guarantees that the arithmetic is correct and that the molecular weight, its
              source and its mass basis are recorded. It cannot detect:
            </p>
            <ol>
              {UNDETECTABLE_FAILURES.map((f) => <li key={f}>{f}</li>)}
            </ol>
          </section>

          {/* §11 / C1-CN-01. Every threshold, its value, and its basis. */}
          <section className="panel" aria-labelledby="register-h">
            <h2 id="register-h">Constants register</h2>
            <p style={{ marginTop: 0 }}>
              Every threshold at which the tool changes behaviour. Thresholds chosen by inspection
              are stated as such.
            </p>
            <table className="register">
              <thead>
                <tr>
                  <th scope="col">Threshold</th>
                  <th scope="col">Value</th>
                  <th scope="col">Basis</th>
                </tr>
              </thead>
              <tbody>
                {CONSTANTS_REGISTER.map((t) => (
                  <tr key={t.id}>
                    <th scope="row" style={{ fontWeight: 400 }}>
                      {t.label}
                      <br />
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{t.status}</span>
                    </th>
                    <td className="val">{t.value}</td>
                    <td className={t.basis === 'derived' ? 'basis-derived' : 'basis-inspection'}>
                      {t.basis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <footer className="site">
          <p>
            Entirely client-side. Nothing you enter leaves your browser: there is no account, no
            analytics, no network request of any kind, and nothing is stored between visits.
          </p>
          <p>
            Research use. Not qualified for GxP decision-making. ·{' '}
            <a href={REPO_URL}>Source</a>
          </p>
        </footer>
      </div>
    </>
  )
}
