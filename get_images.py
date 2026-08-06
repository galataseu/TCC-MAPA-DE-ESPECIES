import requests

def search_unsplash(query):
    # This might require API key, but we can search HTML
    res = requests.get(f"https://unsplash.com/napi/search/photos?query={query}&per_page=1").json()
    if 'results' in res and len(res['results']) > 0:
        return res['results'][0]['urls']['regular']
    return None

print("sapo:", search_unsplash("toad"))
print("peixe:", search_unsplash("fish underwater"))
print("papagaio-cara-roxa:", search_unsplash("parrot flying"))
