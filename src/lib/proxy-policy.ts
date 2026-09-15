const id = "[0-9a-fA-F-]{36}";
const collections = [
  "users",
  "articles",
  "article-categories",
  "banners",
  "pages",
  "media",
  "galleries",
  "partners",
  "menus",
];
export function allowedRoute(path: string, method: string): boolean {
  if (collections.some((name) => new RegExp("^" + name + "$").test(path)))
    return ["GET", "POST"].includes(method);
  if (
    collections.some((name) =>
      new RegExp("^" + name + "/" + id + "$").test(path),
    )
  )
    return ["GET", "PUT", "DELETE"].includes(method);
  if (new RegExp("^articles/" + id + "/(publish|unpublish)$").test(path))
    return method === "POST";
  if (new RegExp("^pages/" + id + "/sections$").test(path))
    return ["GET", "POST"].includes(method);
  if (new RegExp("^page-sections/" + id + "$").test(path))
    return ["PUT", "DELETE"].includes(method);
  if (new RegExp("^galleries/" + id + "/items$").test(path))
    return method === "POST";
  if (new RegExp("^menus/" + id + "/items$").test(path))
    return ["GET", "POST"].includes(method);
  if (new RegExp("^menus/" + id + "/items/" + id + "$").test(path))
    return ["PUT", "DELETE"].includes(method);
  if (path === "settings") return ["GET", "PUT"].includes(method);
  if (
    path === "contact-messages" ||
    new RegExp("^contact-messages/" + id + "$").test(path)
  )
    return method === "GET";
  return (
    new RegExp("^contact-messages/" + id + "/status$").test(path) &&
    method === "PATCH"
  );
}
