import { useState } from "react";

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

  // ✅ 環境変数名を VITE_API_BASE_URL に統一（Amplify 側も同じキーで設定）
  const API_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!API_BASE) {
    // ビルド時に埋め込まれるので、未設定なら起動直後に気づけるようにする
    // （Amplify Hosting → 環境変数 で VITE_API_BASE_URL を設定して再デプロイ）
    throw new Error("VITE_API_BASE_URL が設定されていません。Amplify の環境変数を確認してください。");
  }

  const calculateCost = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      // ✅ HTTP API v2 の既存ルートに合わせる（/estimate）
      const url = `${API_BASE}/estimate`;

      // Lambda 側が期待しているキーを送る（region, currency を明示）
      const payload = {
        instanceType,
        region: "ap-northeast-1",
        currency: "JPY",
        hours,           // 1日あたり稼働時間
        storageGB: storage, // フィールド名の揺れに備えて storageGB も使う
        storage,         // 既存の実装が storage を見ている可能性にも配慮
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // API Gateway + Lambda(Proxy) の場合、{statusCode, body} の形もあり得る
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
          {/* 受け取る JSON のキー名は Lambda 側に合わせて適宜変更 */}
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
