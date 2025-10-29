
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Navigate to the home page
    page.goto("http://localhost:3000/")

    # Click on the Announcements tab
    page.get_by_role("button", name="Announcements").click()
    page.wait_for_selector(".eye-blink")
    page.screenshot(path="jules-scratch/verification/announcements.png")

    # Click on the Recommendations tab
    page.get_by_role("button", name="Recommendations").click()
    page.wait_for_selector(".eye-blink")
    page.screenshot(path="jules-scratch/verification/recommendations.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
