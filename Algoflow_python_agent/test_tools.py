import asyncio
import logging
from browser_tools import BrowserTools, create_driver

logging.basicConfig(level=logging.INFO)


class TestBrowser(BrowserTools):
    def __init__(self):
        self.driver = create_driver(headless=False)
        self.driver.get("https://www.google.com")  # ✅ ADD THIS

    async def run_test(self):
        print("\n=== STEP 1: Current URL ===")
        print(await self.get_current_url(None))

        print("\n=== STEP 2: Read HTML ===")
        html = await self.get_page_html(None)
        print(f"HTML length: {len(html)}")

        print("\n=== STEP 3: Type search ===")
        res = await self.type_into_field(None, "textarea[name='q']", "OpenAI", True)
        print(res)

        await asyncio.sleep(2)

        print("\n=== STEP 4: New URL ===")
        print(await self.get_current_url(None))

        print("\n=== STEP 5: Click result (if possible) ===")
        res = await self.click_element(None, "h3")
        print(res)

        print("\n=== STEP 6: Run JS ===")
        res = await self.run_js(None, "return document.title")
        print("Page title via JS:", res)

        print("\n=== DONE ===")


async def main():
    test = TestBrowser()
    try:
        await test.run_test()
    finally:
        if test.driver:
            test.driver.quit()


if __name__ == "__main__":
    asyncio.run(main())