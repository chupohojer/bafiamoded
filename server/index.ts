console.log("Server is started");

Bun.serve({
  port: 80,
  fetch(req) {
    const { pathname } = new URL(req.url);

    if(pathname == "/" ) return new Response(Bun.file("./run/index.html"));
    if(pathname.startsWith("/.well-known")) return new Response(null, { status: 204 });

    const file = Bun.file("./run" + pathname);
    if(!file.exists()) return new Response("Not found", { status: 404 });

    return new Response(file);
  }
});
