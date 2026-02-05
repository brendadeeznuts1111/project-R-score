export default {
  async fetch() {
    return new Response(
      JSON.stringify([{ id: 1, title: 'Security Briefing', date: '2024-09-02' }]),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
};
