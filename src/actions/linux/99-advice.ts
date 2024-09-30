import type { Action } from "../index.js";
export function run() {
	console.log(`
1. Check for prohibited files (for example, mp3s, videos, etc.) (use the "find" command with the "-name" option)
2. Check for files containing passwords (grep -r [-e "password"]...)
3. Check PAM password policies (grep -r pam_unix.so /etc/pam.d/)
  1. Check for "nullok" (probably in common-auth)
  2. add "minlen=8" (probably in common-password)
4. Check for unnecessary services (use the "systemctl list-unit-files" command)
  1. Check for ssh, apache, nginx
  2. Ensure NOT to disable "essential services" in README!
5. Check for unusual network processes
  1. Check which processes are using the network ("netstat --inet -ap")
  2. Check for open ports ("sudo netstat -tunlp")
6. Use https://github.com/CISOfy/lynis to find other vulnerabilities
    `);
}
export const description = `Additional advice for manual intervention`;
export default run satisfies Action;
