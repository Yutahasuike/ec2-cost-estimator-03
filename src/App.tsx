import { useState, useMemo } from "react";

type InstanceSpec = {
  vcpu: number;
  memoryGiB: number;
  note?: string;
};

// ✅ t3 ファミリーの代表的な仕様（必要に応じて追記可）
const INSTANCE_SPECS: Record<string, InstanceSpec> = {
  "t3.micro":   { vcpu: 2, memoryGiB: 1,  note: "バースト可能（CPUクレジット）。軽量Web/開発向け" },
  "t3.small":   { vcpu: 2, memoryGiB: 2,  note: "小規模アプリ/軽量API" },
  "t3.medium":  { vcpu: 2, memoryGiB: 4,  note: "小〜中規模アプリ/検証環境" },
  "t3.large":   { vcpu: 2, memoryGiB: 8,  note: "中規模API/バッチの軽負荷" },
  "t3.xlarge":  { vcpu: 4, memoryGiB: 16, note: "中規模アプリ/同時接続多め" },
  "t3.2xlarge": { vcpu: 8, memoryGiB: 32, note: "重めの検証/並列処理" },
};

function App() {
  const [instanceType, setInstanceType] = useState("t3.micro");
  const [hours, setHours] = useState(24);      // 1日あたり稼働時間
  const [storage, setStorage] = useState(20);  // gp3 GB
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const instanceOptions = [
    "t3.micro", "t3.small", "t3.medium",
    "t3.large", "t3.xlarge", "t3.2xlarge",
  ];

  // ✅ 選択中タイプの仕様を取得（なければ undefined）
  const selectedSpec = useMemo(() => INSTANCE_SPECS[instanceType], [instanceType]);

  // ✅ 環境変数（Amplify Hosting で VITE_API_BASE_URL を設定）
  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!API_BASE) {
    throw new Error("VITE_API_BASE_URL が設定されていません。Amplify の環境変数を確認してください。");
  }

  const calculateCost = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const url = `${API_BASE}/estimate`;
      const payload = {
        instanceType,
        region: "ap-northeast-1",
        currency: "JPY",
        hours,
        storageGB: storage,
        storage,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.json().catch(() => ({}));
      const body = typeof raw?.body === "string" ? JSON.parse(raw.body) : raw;

      if (!res.ok && raw?.statusCode !== 200) {
        throw new Error(body?.error || `API Error: ${res.status} ${res.statusText}`);
      }

      setResult(body);
    } catch (e: any) {
      setError(e?.message || "ネットワークエラー");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "2rem", fontSize: "1.1rem", maxWidth: 720 }}>
      <h1>EC2 コスト見積もりツール</h1>

      <div style={{ marginTop: 12 }}>
        <label>インスタンスタイプ：</label>{" "}
        <select value={instanceType} onChange={(e) => setInstanceType(e.target.value)}>
          {instanceOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* ✅ スペック表示 */}
      {selectedSpec && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
            lineHeight: 1.6,
          }}
        >
          <b>選択中のスペック</b><br />
          vCPU：{selectedSpec.vcpu} / メモリ：{selectedSpec.memoryGiB} GiB
          {selectedSpec.note && <div style={{ opacity: 0.8, marginTop: 4 }}>補足：{selectedSpec.note}</div>}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label>リージョン：</label> <span>ap-northeast-1（東京）</span>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>1日あたり稼働時間（h）：</label>{" "}
        <input
          type="number"
          min={1}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value) || 0)}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>ストレージ容量（GB、gp3）：</label>{" "}
        <input
          type="number"
          min={1}
          placeholder="20 (GB)"
          value={storage}
          onChange={(e) => setStorage(Number(e.target.value) || 0)}
        />
      </div>

      <button onClick={calculateCost} style={{ marginTop: 16, padding: "8px 16px" }} disabled={loading}>
        {loading ? "計算中..." : "コストを計算"}
      </button>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>エラー: {error}</p>}

      {result && (
        <div style={{ marginTop: 24, padding: 12, border: "1px solid #ddd" }}>
          <h2>結果</h2>
          <p>インスタンスタイプ：{result.instanceType ?? instanceType}</p>
          <p>ストレージ：{result.storageGB ?? storage} GB（gp3）</p>
          {result.exchangeRate && <p>為替レート：{result.exchangeRate} 円 / USD</p>}
          {result.ec2MonthlyUSD !== undefined && <p>EC2（月額・USD）：{result.ec2MonthlyUSD}</p>}
          {result.storageMonthlyUSD !== undefined && <p>ストレージ（月額・USD）：{result.storageMonthlyUSD}</p>}
          {result.totalMonthlyUSD !== undefined && <p><b>合計（月額・USD）：{result.totalMonthlyUSD}</b></p>}
          {result.totalMonthlyJPY !== undefined && <p><b>合計（月額・JPY）：{Number(result.totalMonthlyJPY).toLocaleString()} 円</b></p>}
        </div>
      )}
    </div>
  );
}

export default App;
