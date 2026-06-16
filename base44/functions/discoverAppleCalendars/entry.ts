import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load stored credentials
    const memberships = await base44.asServiceRole.entities.CircleMember.filter({ user_email: user.email });
    const member = memberships?.find(m => m.apple_id && m.apple_app_password);
    if (!member) {
      return Response.json({ error: 'No stored Apple credentials. Please connect Apple Calendar first.' }, { status: 400 });
    }

    const { apple_id: appleId, apple_app_password: appPassword } = member;
    const authHeader = `Basic ${btoa(`${appleId}:${appPassword}`)}`;
    const ICLOUD_CALDAV = 'https://caldav.icloud.com';

    async function caldavRequest(url, method, depth, body) {
      const headers = {
        Authorization: authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'Congrego/1.0',
      };
      if (depth !== null) headers['Depth'] = String(depth);
      return fetch(url, { method, headers, body, redirect: 'follow' });
    }

    // Step 1: principal URL
    const wellKnownRes = await caldavRequest(
      `${ICLOUD_CALDAV}/.well-known/caldav`, 'PROPFIND', 0,
      `<?xml version="1.0" encoding="utf-8"?><D:propfind xmlns:D="DAV:"><D:prop><D:current-user-principal/></D:prop></D:propfind>`
    );
    if (wellKnownRes.status === 401) {
      return Response.json({ error: 'Apple credentials invalid.' }, { status: 401 });
    }
    const realBase = new URL(wellKnownRes.url).origin;
    const wellKnownText = await wellKnownRes.text();

    let principalPath = extractHrefFromTag(wellKnownText, 'current-user-principal');
    if (!principalPath) {
      const m = wellKnownText.match(/<[Hh]ref>([^<]+)<\/[Hh]ref>/);
      principalPath = m ? m[1].trim() : null;
    }
    if (!principalPath) return Response.json({ error: 'Could not find iCloud principal.' }, { status: 400 });

    const principalUrl = toAbsolute(principalPath, realBase);

    // Step 2: calendar home
    const homeRes = await caldavRequest(principalUrl, 'PROPFIND', 0,
      `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><C:calendar-home-set/></D:prop>
</D:propfind>`
    );
    const homeText = await homeRes.text();
    let homePath = extractHrefFromTag(homeText, 'calendar-home-set');
    if (!homePath) {
      const m = homeText.match(/<[Hh]ref>([^<]*calendars[^<]*)<\/[Hh]ref>/);
      homePath = m ? m[1].trim() : null;
    }
    if (!homePath) return Response.json({ error: 'Could not locate iCloud calendar home.' }, { status: 400 });

    const homeUrl = toAbsolute(homePath, realBase);

    // Step 3: list calendars with displayname
    const calListRes = await caldavRequest(homeUrl, 'PROPFIND', 1,
      `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:resourcetype/>
    <D:displayname/>
    <C:supported-calendar-component-set/>
  </D:prop>
</D:propfind>`
    );
    const calListText = await calListRes.text();

    const calendars = [];
    const responseBlocks = splitResponses(calListText);

    for (const block of responseBlocks) {
      const href = extractFirstHref(block);
      if (!href) continue;
      const absHref = toAbsolute(href, realBase);
      if (absHref === homeUrl || absHref === homeUrl + '/') continue;
      const isCalendar = /calendar/i.test(block) && /collection/i.test(block);
      if (!isCalendar) continue;
      const displayNameMatch = block.match(/<[^>]*:?displayname[^>]*>([^<]*)<\/[^>]*:?displayname>/i);
      const displayName = displayNameMatch ? displayNameMatch[1].trim() : absHref.split('/').filter(Boolean).pop();
      calendars.push({ url: absHref, displayname: displayName || 'Unnamed Calendar' });
    }

    return Response.json({ calendars });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function toAbsolute(path, base) {
  if (!path) return base;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return new URL(base).origin + path;
  return base.replace(/\/$/, '') + '/' + path;
}

function extractHrefFromTag(xml, tagName) {
  const tagRe = new RegExp(`<[^>]*:?${tagName}[^>]*>[\\s\\S]*?<[^>]*[Hh]ref[^>]*>([^<]+)<\\/[^>]*[Hh]ref>`, 'i');
  const m = xml.match(tagRe);
  return m ? m[1].trim() : null;
}

function extractFirstHref(block) {
  const m = block.match(/<[^>]*[Hh]ref[^>]*>([^<]+)<\/[^>]*[Hh]ref>/);
  return m ? m[1].trim() : null;
}

function splitResponses(xml) {
  const blocks = [];
  const re = /<[^>]*:?response[^>]*>([\s\S]*?)<\/[^>]*:?response>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) blocks.push(m[1]);
  return blocks;
}