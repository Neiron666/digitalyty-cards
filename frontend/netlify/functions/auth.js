exports.handler = async function retiredAuthEndpoint() {
  return {
    statusCode: 404,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({
      ok: false,
      code: "NOT_FOUND",
    }),
  };
};
