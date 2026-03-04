import { useState, useEffect } from "react";

const API = "https://distributed-task-queue-production-af98.up.railway.app";

const getColor = (status) => {
  switch (status) {
    case "waiting":
      return "#6c757d";
    case "processing":
      return "#f39c12";
    case "retrying":
      return "#8e44ad";
    case "completed":
      return "#27ae60";
    case "failed":
      return "#e74c3c";
    case "pending":
      return "#3498db";
    default:
      return "#2c3e50";
  }
};

function App() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("");

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    total: 0,
  });

  const registerUser = async () => {
    if (!username || !email) {
      alert("Please enter username and email");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data = await res.json();

      setJobId(data.jobId);
      setStatus("waiting");
    } catch (err) {
      console.log(err);
      alert("Server error while registering");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/job/${jobId}`);

        if (!res.ok) return;

        const data = await res.json();

        setStatus(data.status);

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        console.log("Job polling failed");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch(`${API}/jobs`);
        if (!res.ok) return;

        const data = await res.json();

        setJobs(Array.isArray(data) ? data : []);
      } catch {
        console.log("Error fetching jobs");
      }
    };

    fetchJobs();

    const interval = setInterval(fetchJobs, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${API}/metrics`);
        if (!res.ok) return;

        const data = await res.json();

        setMetrics({
          waiting: data.waiting || 0,
          active: data.active || 0,
          completed: data.completed || 0,
          failed: data.failed || 0,
          delayed: data.delayed || 0,
          total: data.total || 0,
        });
      } catch {
        console.log("Error fetching metrics");
      }
    };

    fetchMetrics();

    const interval = setInterval(fetchMetrics, 3000);

    return () => clearInterval(interval);
  }, []);

  const retryJob = async (id) => {
    try {
      const res = await fetch(`${API}/retry-failed/${id}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Retry failed");

      const data = await res.json();

      const newId = data?.result?.id || id;

      setJobId(newId);
      setStatus("waiting");
    } catch {
      alert("Retry failed");
    }
  };

  return (
    <div
      style={{
        fontFamily: "Arial",
        padding: "40px",
        background: "white",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "auto",
          background: "black",
          padding: "30px",
          borderRadius: "10px",
          boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
        }}
      >
        <h1 style={{ textAlign: "center", color: "white" }}>
          📬 Email Queue Dashboard
        </h1>

        {/* METRICS PANEL */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          <Metric title="Waiting" value={metrics.waiting} color="#6c757d" />
          <Metric title="Active" value={metrics.active} color="#f39c12" />
          <Metric title="Completed" value={metrics.completed} color="#27ae60" />
          <Metric title="Failed" value={metrics.failed} color="#e74c3c" />
          <Metric title="Delayed" value={metrics.delayed} color="#8e44ad" />
          <Metric title="Total Jobs" value={metrics.total} color="#3498db" />
        </div>

        <input
          style={{ width: "100%", padding: "10px", marginTop: "20px" }}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          style={{ width: "100%", padding: "10px", marginTop: "10px" }}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "12px",
            background: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
          onClick={registerUser}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Register & Send Email"}
        </button>

        {jobId && (
          <div style={{ marginTop: "30px", textAlign: "center", color: "white" }}>
            <h3>Current Job ID</h3>
            <p>{jobId}</p>

            <h2 style={{ color: getColor(status) }}>Status: {status}</h2>

            {status !== "completed" && status !== "failed" && (
              <p>Checking worker progress...</p>
            )}

            {status === "completed" && (
              <p style={{ color: "green", fontWeight: "bold" }}>
                Email delivered successfully!
              </p>
            )}

            {status === "failed" && (
              <button
                style={{
                  marginTop: "10px",
                  padding: "10px 20px",
                  background: "#e67e22",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onClick={() => retryJob(jobId)}
              >
                Retry Job
              </button>
            )}
          </div>
        )}

        {jobs.length > 0 && (
          <div style={{ marginTop: "40px", color: "white" }}>
            <h3>Recent Jobs</h3>

            <table
              style={{
                width: "100%",
                marginTop: "15px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ background: "gray" }}>
                  <th>Job ID</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Failure Reason</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {jobs.map((job) => (
                  <tr
                    key={job.jobId}
                    style={{
                      textAlign: "center",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <td>{job.jobId}</td>
                    <td>{job.email}</td>

                    <td style={{ color: getColor(job.status) }}>
                      {job.status}
                    </td>

                    <td>{job.attemptsMade || 0}</td>

                    <td>{job.failedReason || "-"}</td>

                    <td>
                      {job.timestamp
                        ? new Date(job.timestamp).toLocaleTimeString()
                        : "-"}
                    </td>

                    <td>
                      {job.status === "failed" && (
                        <button
                          style={{
                            padding: "5px 10px",
                            background: "#e67e22",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          onClick={() => retryJob(job.jobId)}
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ title, value, color }) {
  return (
    <div
      style={{
        background: "#1e1e1e",
        padding: "15px",
        borderRadius: "8px",
        textAlign: "center",
        color: "white",
      }}
    >
      <h4>{title}</h4>
      <h2 style={{ color }}>{value}</h2>
    </div>
  );
}

export default App;