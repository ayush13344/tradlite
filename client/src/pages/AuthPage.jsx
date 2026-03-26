import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, registerUser, clearError } from "../app/features/authSlice";

export default function AuthPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, user } = useSelector((state) => state.auth);

  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (user?._id) {
      localStorage.setItem("userId", user._id);
      localStorage.setItem("user", JSON.stringify(user));
      navigate("/market");
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isLogin) {
      dispatch(
        loginUser({
          email: form.email,
          password: form.password,
        })
      );
    } else {
      dispatch(
        registerUser({
          name: form.name,
          email: form.email,
          password: form.password,
        })
      );
    }
  };

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: "Poppins", sans-serif;
        }

        .auth-wrapper {
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #4f46e5, #6366f1, #818cf8);
          background-size: 200% 200%;
          animation: gradientShift 8s ease infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .auth-card {
          width: 400px;
          padding: 45px 40px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          animation: fadeSlide 0.7s ease;
          transition: 0.3s ease;
        }

        .auth-card:hover {
          transform: translateY(-6px);
        }

        @keyframes fadeSlide {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        h2 {
          text-align: center;
          margin-bottom: 8px;
          color: #111827;
          font-weight: 600;
        }

        .subtitle {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 30px;
        }

        .input-group {
          position: relative;
          margin-bottom: 28px;
        }

        .input-group input {
          width: 100%;
          padding: 12px 10px;
          border: none;
          border-bottom: 2px solid #d1d5db;
          background: transparent;
          font-size: 15px;
          outline: none;
          transition: 0.3s;
        }

        .input-group label {
          position: absolute;
          left: 10px;
          top: 12px;
          font-size: 14px;
          color: #9ca3af;
          pointer-events: none;
          transition: 0.3s ease;
        }

        .input-group input:focus ~ label,
        .input-group input:not(:placeholder-shown) ~ label {
          top: -10px;
          font-size: 12px;
          color: #4f46e5;
        }

        .input-group input:focus {
          border-bottom: 2px solid #4f46e5;
        }

        button {
          width: 100%;
          padding: 13px;
          border-radius: 30px;
          border: none;
          background: linear-gradient(90deg, #4f46e5, #6366f1);
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        button:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .toggle-text {
          text-align: center;
          margin-top: 20px;
          font-size: 14px;
          color: #4b5563;
        }

        .toggle-text span {
          color: #4f46e5;
          cursor: pointer;
          font-weight: 600;
        }

        .error-box {
          background: #fee2e2;
          color: #b91c1c;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 15px;
          font-size: 14px;
          text-align: center;
        }
      `}</style>

      <div className="auth-wrapper">
        <div className="auth-card">
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p className="subtitle">
            {isLogin
              ? "Login to access your trading dashboard"
              : "Start your trading journey today"}
          </p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="input-group">
                <input
                  type="text"
                  required
                  placeholder=" "
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
                <label>Full Name</label>
              </div>
            )}

            <div className="input-group">
              <input
                type="email"
                required
                placeholder=" "
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
              <label>Email</label>
            </div>

            <div className="input-group">
              <input
                type="password"
                required
                placeholder=" "
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
              <label>Password</label>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Processing..." : isLogin ? "Login" : "Register"}
            </button>
          </form>

          <div className="toggle-text">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => {
                dispatch(clearError());
                setIsLogin(!isLogin);
              }}
            >
              {isLogin ? "Register" : "Login"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}