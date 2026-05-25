async function getSession() {
  const { data } = await getSupabase().auth.getSession();
  return data?.session ?? null;
}

async function login(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

async function logout() {
  await getSupabase().auth.signOut();
}

function onAuthStateChange(callback) {
  getSupabase().auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
