export type WikipediaResult = {
  title: string;
  url: string;
  summary?: string;
  thumbnailUrl?: string;
};

export class WikipediaService {
  async searchTopResult(query: string): Promise<WikipediaResult | null> {
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("srlimit", "1");
    searchUrl.searchParams.set("srsearch", query);

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      throw new Error(`Wikipedia search failed with ${searchResponse.status}`);
    }

    const searchData = (await searchResponse.json()) as {
      query?: { search?: { title: string }[] };
    };

    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`;
    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) {
      return {
        title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`
      };
    }

    const summaryData = (await summaryResponse.json()) as {
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
      thumbnail?: { source?: string };
      title?: string;
    };

    return {
      title: summaryData.title ?? title,
      summary: summaryData.extract,
      url:
        summaryData.content_urls?.desktop?.page ??
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      thumbnailUrl: summaryData.thumbnail?.source
    };
  }
}
