export interface ModrinthMod {
  hits: Hit[];
  offset: number;
  limit: number;
  total_hits: number;
}

export interface Hit {
  project_id: string;
  project_type: string;
  slug: string;
  author: string;
  title: string;
  description: string;
  categories: string[];
  display_categories: string[];
  versions: string[];
  downloads: number;
  follows: number;
  icon_url: string | null;
  date_created: string;
  date_modified: string;
  latest_version: string;
  license: string;
  client_side: string;
  server_side: string;
  gallery: any[];
  featured_gallery: any;
  color: number;
}
