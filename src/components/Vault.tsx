import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LockKeyhole, Delete } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import { derive, seal, open } from "../services/vault";
import { spring } from "./Kit";
const configKey = "aether-vault-config";
export function Vault({
  pro,
  privileges,
}: {
  pro: boolean;
  privileges: () => void;
}) {
  const [key, setKey] = useState<CryptoKey>(),
    [pin, setPin] = useState(""),
    [phrase, setPhrase] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [text, setText] = useState(""),
    [id, setId] = useState<string>();
  const [configured, setConfigured] = useState(
    !!localStorage.getItem(configKey),
  );
  const rows = useLiveQuery(() => db.vault.toArray(), []) ?? [];
  const [clear, setClear] = useState<{ id: string; text: string }[]>([]);
  useEffect(() => {
    let active = true;
    if (key && pro)
      void db.vault
        .toArray()
        .then((r) =>
          Promise.all(
            r.map(async (row) => ({ id: row.id, text: await open(key, row) })),
          ),
        )
        .then((r) => {
          if (active) setClear(r);
        })
        .catch(() => {
          if (active) setError("A vault record could not be decrypted.");
        });
    return () => {
      active = false;
    };
  }, [key, rows.length, pro, text]);
  const lock = () => {
    setKey(undefined);
    setClear([]);
    setText("");
    setId(undefined);
    setError("");
  };
  async function unlock() {
    setBusy(true);
    setError("");
    try {
      const saved = localStorage.getItem(configKey);
      if (!/^\d{4}$/.test(pin) || (!saved && phrase.length < 12))
        throw Error(
          "Enter a four-digit PIN and a passphrase of at least 12 characters.",
        );
      const existing = saved ? JSON.parse(saved) : null;
      const salt: number[] =
        existing?.salt ??
        Array.from(crypto.getRandomValues(new Uint8Array(16)));
      const next = await derive(`${pin}:${phrase}`, salt);
      if (existing) {
        await open(next, {
          id: "verify",
          iv: new Uint8Array(existing.iv).buffer,
          cipher: new Uint8Array(existing.cipher).buffer,
        });
      } else {
        const verifier = await seal(next, "aether-vault", "verify");
        localStorage.setItem(
          configKey,
          JSON.stringify({
            salt,
            iv: Array.from(new Uint8Array(verifier.iv)),
            cipher: Array.from(new Uint8Array(verifier.cipher)),
          }),
        );
        setConfigured(true);
      }
      setKey(next);
      setPin("");
      setPhrase("");
    } catch (e) {
      setError(
        e instanceof DOMException
          ? "Incorrect credentials or unavailable secure storage."
          : String((e as Error).message),
      );
    } finally {
      setBusy(false);
    }
  }
  if (!pro)
    return (
      <section className="panel gate">
        <LockKeyhole />
        <h2>Vault is locked</h2>
        <p>Architect Pro enables the encrypted local vault.</p>
        <button className="primary" onClick={privileges}>
          Manage privileges
        </button>
      </section>
    );
  return (
    <section className="panel vault stack">
      <div className="row spread">
        <h2>
          <LockKeyhole size={20} /> Encrypted Vault
        </h2>
        {key && <button onClick={lock}>Lock vault</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {key ? (
        <motion.div
          className="stack"
          initial={{ filter: "blur(14px)", opacity: 0 }}
          animate={{ filter: "blur(0px)", opacity: 1 }}
          transition={spring}
        >
          {clear.map((r) => (
            <div className="row spread" key={r.id}>
              <button
                onClick={() => {
                  setText(r.text);
                  setId(r.id);
                }}
              >
                {r.text.split("\n")[0].slice(0, 65)}
              </button>
              <button
                onClick={async () => {
                  try {
                    await db.vault.delete(r.id);
                    if (id === r.id) {
                      setId(undefined);
                      setText("");
                    }
                  } catch {
                    setError("Could not delete the entry.");
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
          <textarea
            placeholder="Write a confidential note…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row">
            <button
              className="primary"
              disabled={!text.trim() || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await db.vault.put(await seal(key, text, id));
                  setClear(
                    (await db.vault.toArray()).map((r) => ({
                      id: r.id,
                      text:
                        r.id === id
                          ? text
                          : (clear.find((c) => c.id === r.id)?.text ?? text),
                    })),
                  );
                  setId(undefined);
                  setText("");
                } catch {
                  setError("Could not save the entry.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save encrypted note
            </button>
            {id && (
              <button
                onClick={() => {
                  setId(undefined);
                  setText("");
                }}
              >
                New entry
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <>
          <p>
            {configured
              ? "Enter your PIN and passphrase."
              : "Choose a four-digit PIN and a strong passphrase. Both are required to decrypt your notes; there is no recovery key."}
          </p>
          <div className="vault-mask" aria-hidden="true">
            ▰▰▰▰▰▰▰▰▰▰▰
          </div>
          <input
            aria-label="Vault PIN"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
          <div className="keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "back"].map(
              (n) => (
                <button
                  key={n}
                  aria-label={n === "back" ? "Backspace" : n}
                  onClick={() =>
                    setPin(
                      n === "back" ? pin.slice(0, -1) : (pin + n).slice(0, 4),
                    )
                  }
                >
                  {n === "back" ? <Delete size={16} /> : n}
                </button>
              ),
            )}
          </div>
          <input
            type="password"
            aria-label="Vault passphrase"
            placeholder="Vault passphrase"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
          />
          <button
            className="primary"
            disabled={busy}
            onClick={() => void unlock()}
          >
            {configured ? "Unlock" : "Set up vault"}
          </button>
        </>
      )}
    </section>
  );
}
