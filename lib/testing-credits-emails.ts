/**
 * Testing credits — emails that receive trial access to build one 3D website.
 * ~800 credits, 1 site, ~2 images + 1 short video, in-app preview (ZIP export disabled).
 *
 * Add emails below. Run `npm run add-testing-credits -- email@example.com` to add via script.
 */

const TESTING_CREDITS_EMAILS = new Set<string>(
  [
    'abdulrafayrajpoot101@gmail.com',
    'adel.assi1@hotmail.com',
    'adjeimensah1998@gmail.com',
    'agrawal.archi0601@gmail.com',
    'ahmed.jahenzaib123@gmail.com',
    'albertfredy007@gmail.com',
    'alexandrelopespohl@gmail.com',
    'aliprogramming22@gmail.com',
    'alistairdmonte@gmail.com',
    'amirh1382@gmail.com',
    'andres.quiceno@gmail.com',
    'angela-leitte@hotmail.com',
    'arthurbreck417@gmail.com',
    'atahar.ishtiaque2005@gmail.com',
    'aymanealouche@gmail.com',
    'benedikt@thomma.ch',
    'caneratay426@gmail.com',
    'christopher.jeremy.aw@gmail.com',
    'drutsis.s@gmail.com',
    'ekinsulu@gmail.com',
    'elhamzaoui.hmed@gmail.com',
    'felipeandrade55@gmail.com',
    'gabrielciloe.dev@gmail.com',
    'garcia@campaignersnetwork.de',
    'giusep.p.e@gmail.com',
    'guillemvera@gmail.com',
    'hussainshehryar1@gmail.com',
    'inmagdaleno@gmail.com',
    'info.occhio.interiore@gmail.com',
    'jacksonalexander.10k@gmail.com',
    'j06haniel@gmail.com',
    'jacek.stankiewicz1602@gmail.com',
    'johnviti21@gmail.com',
    'joartist01101978@gmail.com',
    'karam200566@gmail.com',
    'kyle.chester87@gmail.com',
    'laionfacu@gmail.com',
    'laith20002022@gmail.com',
    'lemorafique@gmail.com',
    'lno.mcl4670@gmail.com',
    'mahmoudhamam892@gmail.com',
    'mahnoornawaz258@gmail.com',
    'marcushatzakis@gmail.com',
    'max3.1994@gmail.com',
    'mo7amed2ymen@gmail.com',
    'moanasak069@gmail.com',
    'mohammedbaqur195@gmail.com',
    'monfranklins@gmail.com',
    'paulomelo.ia@gmail.com',
    'private91@tutamail.com',
    'pshm40@gmail.com',
    'raissalopesbr@gmail.com',
    'saarshalit1@gmail.com',
    'sharoncjhon@gmail.com',
    'silvarodrigueswender30@gmail.com',
    'stuttgart_av@yahoo.com',
    'tareknotnice@protonmail.com',
    'tobi.vb@gmx.at',
    'tochaudry@gmail.com',
    'vojanmatyas@gmail.com',
    'voltajix@gmail.com',
    'waqarrafiquexd@gmail.com',
    'ysclah@gmail.com',
    'abrahamaaron26@gmail.com',
  ].map((e) => e.trim().toLowerCase()).filter(Boolean),
);

export function isTestingCreditsEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return TESTING_CREDITS_EMAILS.has(email.trim().toLowerCase());
}

export function getTestingCreditsEmails(): string[] {
  return Array.from(TESTING_CREDITS_EMAILS).sort();
}
