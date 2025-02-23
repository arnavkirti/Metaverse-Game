import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

describe("Authentication", () => {
  test("user is able to signup", async () => {
    const username = "username" + Math.random();
    const password = "12345678";
    const response = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });
    expect(response.status).toBe(200);

    const updatedResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });

    expect(updatedResponse.status).toBe(400);
  });
});
