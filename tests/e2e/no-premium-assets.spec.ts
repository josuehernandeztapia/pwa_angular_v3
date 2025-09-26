import { test, expect } from '@playwright/test';

test.describe('Minimal Dark - No Premium assets/classes', () => {
  test('should not request theme-premium.css and DOM has no .premium-*', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));

    await page.goto('/');

    // Assert no premium CSS requested
    const premiumRequests = requests.filter((u) => /theme-premium\.css/i.test(u));
    expect(premiumRequests, 'theme-premium.css must not be requested').toHaveLength(0);

    // Assert no elements with classes starting with premium-
    const hasPremiumClass = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      let node: Element | null = walker.currentNode as Element;
      while (node) {
        for (const cls of Array.from(node.classList || [])) {
          if (cls.startsWith('premium-')) return true;
        }
        node = walker.nextNode() as Element | null;
      }
      return false;
    });
    expect(hasPremiumClass, 'DOM must not contain classes with prefix premium-').toBeFalsy();

    // Also assert no inline styles referencing premium animations file name just in case
    const hasPremiumRef = await page.evaluate(() => {
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')) as Array<HTMLLinkElement | HTMLStyleElement>;
      return styles.some((el) => {
        if (el.tagName === 'LINK') {
          const href = (el as HTMLLinkElement).href || '';
          return /theme-premium\.css/i.test(href);
        }
        const text = (el as HTMLStyleElement).textContent || '';
        return /theme-premium|premium-animations/i.test(text);
      });
    });
    expect(hasPremiumRef, 'No references to theme-premium or premium-animations should exist').toBeFalsy();
  });
});

