# Virtual Library

Static site: `index.html` + `books.json`. No build step.

## Edit your books
Edit `books.json`. Each book: `title`, `author`, `isbn` (optional, used for the cover), `status` (`read` | `reading` | `to-read`), `rating` (0-5), `finished` (`YYYY-MM`), `tags`, `note`.

## Preview locally
    python3 -m http.server 4173

## Deploy to Vercel
    git init && git add . && git commit -m "library"
    # push to a GitHub repo, then import it at vercel.com/new (Framework: Other)
    # or: npx vercel --prod

## LinkedIn
- Add the Vercel URL under Profile > Add section > Featured > Add a link.
- Add `og.png` (1200x630) and set `og:image` to the full URL so the link shows a preview card.
- Optionally add it under Contact info > Website.
