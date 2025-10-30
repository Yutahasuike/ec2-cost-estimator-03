import { useState } from "react";

function App() {
  const [instanceType, setInstanceType] = useState("t3.micro");
  const [hours, setHours] = useState(24);      // 1日あたり稼働時間
  const [storage, setStorage] = useState(20);  // gp3 GB
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const instanceOptions = [
    "t3.micro", "t3.small", "t3.medium",
    "t3.large", "t3.xlarge", "t3.2xlarge",
  ];

  const API_URL = import.meta.env.VITE_API_ENDPOINT; // Amplify 環境変数

  const calculateCost = async () => {
    setError(null);
    setResult(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceType, hours, storage }),
      });
      const data = await res.json();
      // Lambda(API GW統合) の戻りが { statusCode, body } の場合を吸収
      const body = typeof data.body === "string" ? JSON.parse(data.body) : data;
      if (res.ok || data.statusCode === 200) setResult(body);
      else setError(body?.error || "API エラー");
    } catch (e: any) {
      setError(e?.message || "ネットワークエラー");
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
        <input type="number" min={1} value={hours}
          onChange={(e) => setHours(Number(e.target.value))} />
      </div>

      <div style={{ marginTop: 12 }}>
        <label>ストレージ容量（GB、gp3）：</label>{" "}
        <input type="number" min={1} placeholder="20 (GB)"
          value={storage} onChange={(e) => setStorage(Number(e.target.value))} />
      </div>

      <button onClick={calculateCost} style={{ marginTop: 16, padding: "8px 16px" }}>
        コストを計算
      </button>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>エラー: {error}</p>}

      {result && (
        <div style={{ marginTop: 24, padding: 12, border: "1px solid #ddd" }}>
          <h2>結果</h2>
          <p>インスタンスタイプ：{result.instanceType}</p>
          <p>ストレージ：{result.storageGB} GB（gp3）</p>
          <p>為替レート：{result.exchangeRate} 円 / USD</p>
          <p>EC2（月額・USD）：{result.ec2MonthlyUSD}</p>
          <p>ストレージ（月額・USD）：{result.storageMonthlyUSD}</p>
          <p><b>合計（月額・USD）：{result.totalMonthlyUSD}</b></p>
          <p><b>合計（月額・JPY）：{Number(result.totalMonthlyJPY).toLocaleString()} 円</b></p>
        </div>
      )}
    </div>
  );
}

export default App;
