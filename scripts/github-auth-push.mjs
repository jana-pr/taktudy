import { execSync } from 'node:child_process';

const CLIENT_ID = '178c6fc778ccc68e1d6a'; // Official GitHub CLI client ID

async function main() {
  console.log('Initiating GitHub Device Authorization...');

  const deviceRes = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      scope: 'repo',
    }),
  });

  const deviceData = await deviceRes.json();
  if (!deviceData.device_code) {
    console.error('Failed to get device code:', deviceData);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log(`👉 1. Otevřete v prohlížeči: ${deviceData.verification_uri}`);
  console.log(`👉 2. Zadejte tento kód:    ${deviceData.user_code}`);
  console.log('👉 3. Klikněte na zelené tlačítko "Continue" / "Authorize"');
  console.log('======================================================\n');
  console.log('Čekám na vaše potvrzení v prohlížeči...');

  const intervalMs = (deviceData.interval || 5) * 1000;
  const startTime = Date.now();
  const maxTimeMs = (deviceData.expires_in || 900) * 1000;

  while (Date.now() - startTime < maxTimeMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const pollRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceData.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const tokenData = await pollRes.json();

    if (tokenData.access_token) {
      console.log('\n✅ Autorizace na GitHubu byla úspěšně schválena!');
      console.log('Odesílám kód projektu do https://github.com/jana-pr/taktudy.git ...');

      const git = 'C:\\Users\\prosk\\AppData\\Local\\MinGit\\cmd\\git.exe';
      const authenticatedUrl = `https://x-access-token:${tokenData.access_token}@github.com/jana-pr/taktudy.git`;

      try {
        execSync(`"${git}" push "${authenticatedUrl}" main:main --force`, {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        console.log('\n🎉 HOTOVO! Všechny soubory a kód jsou nahrané na https://github.com/jana-pr/taktudy');
      } catch (pushErr) {
        console.error('Chyba při odesílání do git:', pushErr);
        process.exit(1);
      }
      return;
    }

    if (tokenData.error === 'authorization_pending') {
      // Still waiting
      continue;
    } else if (tokenData.error === 'slow_down') {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else if (tokenData.error) {
      console.error('Chyba autorizace:', tokenData.error_description || tokenData.error);
      process.exit(1);
    }
  }

  console.error('Časový limit pro zadání kódu vypršel.');
  process.exit(1);
}

main().catch(console.error);
