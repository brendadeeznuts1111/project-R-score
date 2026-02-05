export default {
  async fetch() {
    return new Response(
      JSON.stringify([{ id: 1, title: 'Security Implementation', status: 'ACTIVE' }]),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};
