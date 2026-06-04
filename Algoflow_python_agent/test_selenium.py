from browser_tools import create_driver

driver = create_driver(headless=False)

driver.get("https://www.google.com")
print("Title:", driver.title)

input("Press Enter to close...")
driver.quit()