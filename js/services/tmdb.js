/**
 * IPTV Player - TMDB Service
 * Handles movie/series metadata from The Movie Database
 */

class TMDBService {
    constructor() {
        this.baseUrl = CONFIG.tmdb.baseUrl;
        this.apiKey = CONFIG.tmdb.apiKey;
        this.language = CONFIG.tmdb.language;
        this.imageBaseUrl = CONFIG.tmdb.imageBaseUrl;
    }

    /**
     * Build TMDB API URL
     */
    buildUrl(endpoint, params = {}) {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.append('api_key', this.apiKey);
        url.searchParams.append('language', this.language);

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        return url.toString();
    }

    /**
     * Get image URL
     */
    getImageUrl(path, size = 'medium', type = 'poster') {
        if (!path) return null;

        const sizes = CONFIG.tmdb[`${type}Sizes`] || CONFIG.tmdb.posterSizes;
        const sizeCode = sizes[size] || sizes.medium;

        return `${this.imageBaseUrl}/${sizeCode}${path}`;
    }

    /**
     * Search for movies
     */
    async searchMovies(query, page = 1) {
        const url = this.buildUrl(TMDB_ENDPOINTS.searchMovie, { query, page });
        const data = await api.get(url, {
            cacheKey: `tmdb_search_movie_${query}_${page}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbSearch
        });

        return {
            results: data.results.map(movie => this.transformMovie(movie)),
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results
        };
    }

    /**
     * Search for TV series
     */
    async searchTv(query, page = 1) {
        const url = this.buildUrl(TMDB_ENDPOINTS.searchTv, { query, page });
        const data = await api.get(url, {
            cacheKey: `tmdb_search_tv_${query}_${page}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbSearch
        });

        return {
            results: data.results.map(tv => this.transformTvShow(tv)),
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results
        };
    }

    /**
     * Search both movies and TV
     */
    async searchMulti(query, page = 1) {
        const url = this.buildUrl(TMDB_ENDPOINTS.searchMulti, { query, page });
        const data = await api.get(url, {
            cacheKey: `tmdb_search_multi_${query}_${page}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbSearch
        });

        return {
            results: data.results.map(item => {
                if (item.media_type === 'movie') {
                    return this.transformMovie(item);
                } else if (item.media_type === 'tv') {
                    return this.transformTvShow(item);
                } else if (item.media_type === 'person') {
                    return this.transformPerson(item);
                }
                return item;
            }).filter(Boolean),
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results
        };
    }

    /**
     * Get movie details
     */
    async getMovieDetails(movieId) {
        const url = this.buildUrl(TMDB_ENDPOINTS.movieDetails(movieId), {
            append_to_response: 'credits,videos,recommendations'
        });

        const data = await api.get(url, {
            cacheKey: `tmdb_movie_${movieId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbDetails
        });

        return this.transformMovieDetails(data);
    }

    /**
     * Get TV show details
     */
    async getTvDetails(tvId) {
        const url = this.buildUrl(TMDB_ENDPOINTS.tvDetails(tvId), {
            append_to_response: 'credits,videos,recommendations'
        });

        const data = await api.get(url, {
            cacheKey: `tmdb_tv_${tvId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbDetails
        });

        return this.transformTvDetails(data);
    }

    /**
     * Get person details
     */
    async getPersonDetails(personId) {
        const url = this.buildUrl(TMDB_ENDPOINTS.personDetails(personId), {
            append_to_response: 'movie_credits,tv_credits'
        });

        const data = await api.get(url, {
            cacheKey: `tmdb_person_${personId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.person
        });

        return this.transformPersonDetails(data);
    }

    /**
     * Get movie credits (cast & crew)
     */
    async getMovieCredits(movieId) {
        const url = this.buildUrl(TMDB_ENDPOINTS.movieCredits(movieId));
        const data = await api.get(url, {
            cacheKey: `tmdb_movie_credits_${movieId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbDetails
        });

        return {
            cast: data.cast.slice(0, 20).map(person => this.transformCastMember(person)),
            crew: this.extractKeyCrewMembers(data.crew)
        };
    }

    /**
     * Get TV credits
     */
    async getTvCredits(tvId) {
        const url = this.buildUrl(TMDB_ENDPOINTS.tvCredits(tvId));
        const data = await api.get(url, {
            cacheKey: `tmdb_tv_credits_${tvId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.tmdbDetails
        });

        return {
            cast: data.cast.slice(0, 20).map(person => this.transformCastMember(person)),
            crew: this.extractKeyCrewMembers(data.crew)
        };
    }

    /**
     * Get person's movie credits
     */
    async getPersonMovieCredits(personId) {
        const url = this.buildUrl(TMDB_ENDPOINTS.personMovieCredits(personId));
        const data = await api.get(url, {
            cacheKey: `tmdb_person_movies_${personId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.person
        });

        return {
            cast: data.cast.map(movie => this.transformMovie(movie)),
            crew: data.crew.map(movie => this.transformMovie(movie))
        };
    }

    /**
     * Get person's TV credits
     */
    async getPersonTvCredits(personId) {
        const url = this.buildUrl(TMDB_ENDPOINTS.personTvCredits(personId));
        const data = await api.get(url, {
            cacheKey: `tmdb_person_tv_${personId}`,
            cacheExpiry: CONFIG.memory.cacheExpiry.person
        });

        return {
            cast: data.cast.map(tv => this.transformTvShow(tv)),
            crew: data.crew.map(tv => this.transformTvShow(tv))
        };
    }

    /**
     * Match IPTV content with TMDB
     */
    async matchContent(name, type = 'movie') {
        // Clean the name for better search
        const cleanName = this.cleanTitle(name);

        try {
            let results;
            if (type === 'movie') {
                results = await this.searchMovies(cleanName);
            } else {
                results = await this.searchTv(cleanName);
            }

            if (results.results.length > 0) {
                // Return the best match (first result)
                return results.results[0];
            }

            return null;
        } catch (error) {
            console.warn(`Failed to match "${name}":`, error.message);
            return null;
        }
    }

    /**
     * Clean title for search
     */
    cleanTitle(title) {
        return title
            // Remove quality indicators
            .replace(/\b(4K|UHD|HDR|1080p|720p|480p|HD|SD|REMUX|BDRip|HDTV|WEBRip|BluRay)\b/gi, '')
            // Remove year in parentheses (will search without year first)
            .replace(/\(\d{4}\)/g, '')
            // Remove audio format
            .replace(/\b(DTS|AAC|AC3|FLAC|MP3|Atmos|TrueHD)\b/gi, '')
            // Remove language indicators
            .replace(/\b(DUAL|DUBLADO|LEGENDADO|PTBR|PT-BR)\b/gi, '')
            // Remove special characters except spaces and common punctuation
            .replace(/[^\w\s\-':]/g, ' ')
            // Remove multiple spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Transform raw movie data
     */
    transformMovie(movie) {
        return {
            tmdbId: movie.id,
            type: 'movie',
            title: movie.title,
            originalTitle: movie.original_title,
            overview: movie.overview,
            releaseDate: movie.release_date,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : null,
            rating: movie.vote_average,
            voteCount: movie.vote_count,
            popularity: movie.popularity,
            posterPath: this.getImageUrl(movie.poster_path, 'medium', 'poster'),
            backdropPath: this.getImageUrl(movie.backdrop_path, 'large', 'backdrop'),
            genreIds: movie.genre_ids || [],
            adult: movie.adult
        };
    }

    /**
     * Transform raw TV show data
     */
    transformTvShow(tv) {
        return {
            tmdbId: tv.id,
            type: 'tv',
            title: tv.name,
            originalTitle: tv.original_name,
            overview: tv.overview,
            firstAirDate: tv.first_air_date,
            year: tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null,
            rating: tv.vote_average,
            voteCount: tv.vote_count,
            popularity: tv.popularity,
            posterPath: this.getImageUrl(tv.poster_path, 'medium', 'poster'),
            backdropPath: this.getImageUrl(tv.backdrop_path, 'large', 'backdrop'),
            genreIds: tv.genre_ids || [],
            adult: tv.adult
        };
    }

    /**
     * Transform movie details
     */
    transformMovieDetails(movie) {
        const transformed = this.transformMovie(movie);

        return {
            ...transformed,
            tagline: movie.tagline,
            runtime: movie.runtime,
            budget: movie.budget,
            revenue: movie.revenue,
            genres: movie.genres || [],
            productionCompanies: movie.production_companies || [],
            spokenLanguages: movie.spoken_languages || [],
            status: movie.status,
            imdbId: movie.imdb_id,
            cast: movie.credits?.cast?.slice(0, 15).map(p => this.transformCastMember(p)) || [],
            crew: this.extractKeyCrewMembers(movie.credits?.crew || []),
            videos: this.extractTrailers(movie.videos?.results || []),
            recommendations: movie.recommendations?.results?.slice(0, 10).map(m => this.transformMovie(m)) || []
        };
    }

    /**
     * Transform TV details
     */
    transformTvDetails(tv) {
        const transformed = this.transformTvShow(tv);

        return {
            ...transformed,
            tagline: tv.tagline,
            episodeRunTime: tv.episode_run_time?.[0] || null,
            numberOfSeasons: tv.number_of_seasons,
            numberOfEpisodes: tv.number_of_episodes,
            genres: tv.genres || [],
            networks: tv.networks || [],
            createdBy: tv.created_by || [],
            status: tv.status,
            lastAirDate: tv.last_air_date,
            seasons: tv.seasons?.map(s => ({
                id: s.id,
                seasonNumber: s.season_number,
                name: s.name,
                overview: s.overview,
                episodeCount: s.episode_count,
                airDate: s.air_date,
                posterPath: this.getImageUrl(s.poster_path, 'medium', 'poster')
            })) || [],
            cast: tv.credits?.cast?.slice(0, 15).map(p => this.transformCastMember(p)) || [],
            crew: this.extractKeyCrewMembers(tv.credits?.crew || []),
            videos: this.extractTrailers(tv.videos?.results || []),
            recommendations: tv.recommendations?.results?.slice(0, 10).map(t => this.transformTvShow(t)) || []
        };
    }

    /**
     * Transform person data
     */
    transformPerson(person) {
        return {
            tmdbId: person.id,
            type: 'person',
            name: person.name,
            profilePath: this.getImageUrl(person.profile_path, 'medium', 'profile'),
            knownFor: person.known_for_department,
            popularity: person.popularity
        };
    }

    /**
     * Transform person details
     */
    transformPersonDetails(person) {
        return {
            tmdbId: person.id,
            name: person.name,
            biography: person.biography,
            birthday: person.birthday,
            deathday: person.deathday,
            placeOfBirth: person.place_of_birth,
            profilePath: this.getImageUrl(person.profile_path, 'large', 'profile'),
            knownFor: person.known_for_department,
            popularity: person.popularity,
            imdbId: person.imdb_id,
            homepage: person.homepage,
            movieCredits: {
                cast: person.movie_credits?.cast?.map(m => this.transformMovie(m)) || [],
                crew: person.movie_credits?.crew?.map(m => this.transformMovie(m)) || []
            },
            tvCredits: {
                cast: person.tv_credits?.cast?.map(t => this.transformTvShow(t)) || [],
                crew: person.tv_credits?.crew?.map(t => this.transformTvShow(t)) || []
            }
        };
    }

    /**
     * Transform cast member
     */
    transformCastMember(person) {
        return {
            tmdbId: person.id,
            name: person.name,
            character: person.character,
            profilePath: this.getImageUrl(person.profile_path, 'small', 'profile'),
            order: person.order
        };
    }

    /**
     * Extract key crew members (director, writer, etc)
     */
    extractKeyCrewMembers(crew) {
        const keyJobs = ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer'];
        const result = {};

        crew.forEach(member => {
            if (keyJobs.includes(member.job)) {
                if (!result[member.job]) {
                    result[member.job] = [];
                }
                result[member.job].push({
                    tmdbId: member.id,
                    name: member.name,
                    job: member.job,
                    profilePath: this.getImageUrl(member.profile_path, 'small', 'profile')
                });
            }
        });

        return result;
    }

    /**
     * Extract trailers from videos
     */
    extractTrailers(videos) {
        return videos
            .filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
            .slice(0, 3)
            .map(v => ({
                key: v.key,
                name: v.name,
                type: v.type,
                url: `https://www.youtube.com/watch?v=${v.key}`
            }));
    }

    /**
     * Find content in IPTV list by TMDB match
     */
    async findInIPTVList(tmdbData, iptvItems) {
        const searchTerms = [
            tmdbData.title,
            tmdbData.originalTitle
        ].filter(Boolean);

        const matches = [];

        for (const term of searchTerms) {
            const termLower = term.toLowerCase();

            for (const item of iptvItems) {
                const itemName = (item.name || item.title || '').toLowerCase();

                if (itemName.includes(termLower) || termLower.includes(itemName)) {
                    matches.push(item);
                }
            }
        }

        // Remove duplicates
        const uniqueMatches = [...new Map(matches.map(m => [m.id, m])).values()];

        return uniqueMatches;
    }
}

// Create global instance
const tmdb = new TMDBService();
