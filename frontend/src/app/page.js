"use client"
import { useState } from "react";
import axios from "axios";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/signup", {
        email,
        password,
        role,
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response?.data.message || "Error signing up!");
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleSignup} className="p-6 bg-white rounded shadow-md">
        <h1 className="text-xl font-bold mb-4">Signup</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full p-2 mb-4 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full p-2 mb-4 border rounded"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="block w-full p-2 mb-4 border rounded"
        >
          <option value="client">Client</option>
          <option value="ops">Ops</option>
        </select>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded"
        >
          Signup
        </button>
        {message && <p className="mt-4 text-center">{message}</p>}
      </form>
    </div>
  );
}
