export const examples_movies = [
    {
        "input": "Tell me the name of 5 actors who have acted in the most movies, along with the number of movies they have acted in.",
        "output": {
            "sqlQuery": "```sql\nSELECT p.person_name, COUNT(mc.person_id) AS movie_count\nFROM movies.person p\nJOIN movies.movie_cast mc ON p.person_id = mc.person_id\nGROUP BY p.person_name\nORDER BY movie_count DESC\nLIMIT 5;\n```",
            "answer": "1. Samuel L. Jackson - 67 movies\n2. Robert De Niro - 57 movies\n3. Bruce Willis - 51 movies\n4. Matt Damon - 48 movies\n5. Morgan Freeman - 46 movies"
        }
    },
    {
        "input": "Tell me about the movies table",
        "output": {
            "sqlQuery": "N/A",
            "answer": "The \"movies\" table contains information about movies, including columns like movie_id, title, budget, homepage, overview, popularity, release_date, revenue, runtime, movie_status, tagline, vote_average, and vote_count. Some sample rows from the table are:\n- Movie ID: 5, Title: Four Rooms, Budget: 4000000, Homepage: Not specified, Overview: It's Ted the Bellhop's first night on the job...and the hotel's very unusual guests are about to place him in some outrageous predicaments., Popularity: 22.876230, Release Date: Sat Dec 09 1995, Revenue: 4300000, Runtime: 98, Movie Status: Released, Tagline: Twelve outrageous guests. Four scandalous requests. And one lone bellhop, in his first day on the job, who's in for the wildest New year's Eve of his life., Vote Average: 6.50, Vote Count: 530\n- Movie ID: 11, Title: Star Wars, Budget: 11000000, Homepage: http://www.starwars.com/films/star-wars-episode-iv-a-new-hope, Overview: Princess Leia is captured and held hostage by the evil Imperial forces in their effort to take over the galactic Empire. Venturesome Luke Skywalker and dashing captain Han Solo team together with the loveable robot duo R2-D2 and C-3PO to rescue the beautiful princess and restore peace and justice in the Empire., Popularity: 126.393695, Release Date: Wed May 25 1977, Revenue: 775398007, Runtime: 121, Movie Status: Released, Tagline: A long time ago in a galaxy far, far away..., Vote Average: 8.10, Vote Count: 6624\n- Movie ID: 12, Title: Finding Nemo, Budget: 94000000, Homepage: http://movies.disney.com/finding-nemo, Overview: Nemo, an adventurous young clownfish, is unexpectedly taken from his Great Barrier Reef home to a dentist's office aquarium. It's up to his worrisome father Marlin and a friendly but forgetful fish Dory to bring Nemo home -- meeting vegetarian sharks, surfer dude turtles, hypnotic jellyfish, hungry seagulls, and more along the way., Popularity: 85.688789, Release Date: Fri May 30 2003, Revenue: 940335536, Runtime: 100, Movie Status: Released, Tagline: There are 3.7 trillion fish in the ocean, they're looking for one., Vote Average: 7.60, Vote Count: 6122"
        }
    },
    {
        "input": "List 15 horror movies ordered by its budget, showing title and budget",
        "output": {
            "sqlQuery": "```sql\nSELECT title, budget \nFROM movies.movie \nWHERE title LIKE '%Horror%' \nORDER BY budget DESC \nLIMIT 15;\n```",
            "answer": "1. Movie: Little Shop of Horrors, Budget: $25,000,000\n2. Movie: The Amityville Horror, Budget: $19,000,000\n3. Movie: #Horror, Budget: $1,500,000\n4. Movie: The Horror Network Vol. 1, Budget: $0"
        }
    },
    {
        "input": "How many characters has Harrison Ford interpreted?",
        "output": {
            "sqlQuery": "```sql\nSELECT COUNT(mc.person_id)\nFROM movies.person p\nJOIN movies.movie_cast mc ON p.person_id = mc.person_id\nWHERE p.person_name = 'Harrison Ford';\n```",
            "answer": "Harrison Ford has interpreted 32 characters."
        }
    },
    {
        "input": "What is the average revenue of all movies?",
        "output": {
            "sqlQuery": "```sql\nSELECT AVG(revenue) AS average_revenue FROM movie;\n```",
            "answer": "The average revenue of all movies is $41,371,290."
        }
    },
    {
        "input": "What is the most common keyword?",
        "output": {
            "sqlQuery": "```sql\nSELECT kw.keyword_name, COUNT(*) AS keyword_count\nFROM movies.movie_keywords mk\nJOIN movies.keyword kw\nON kw.keyword_id = mk.keyword_id\nGROUP BY kw.keyword_name\nORDER BY keyword_count DESC\nLIMIT 1```",
            "answer": "The most common keyword is \"woman director\"."
        }
    }
]