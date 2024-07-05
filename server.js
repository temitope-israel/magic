const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
require('dotenv').config();
const { comments, quotes } = require('./data'); // Import data from data.js

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/start-automation', async (req, res) => {
    const { username, password, tweetUrls, timeout } = req.body;

    try {
        await runAutomation(username, password, tweetUrls, timeout);
        res.json({ message: 'Automation completed successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred during automation.' });
    }
});

async function runAutomation(username, password, tweetUrls, timeout) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[name="text"]');
    await page.type('input[name="text"]', username, { delay: 200 });

    await page.waitForSelector('button[class="css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-ywje51 r-184id4b r-13qz1uu r-2yi16 r-1qi8awa r-3pj75a r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l"]');
    await page.click('button[class="css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-ywje51 r-184id4b r-13qz1uu r-2yi16 r-1qi8awa r-3pj75a r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l"]');

    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', password, { delay: 200 });

    await page.waitForSelector('button[data-testid="LoginForm_Login_Button"]');
    await page.click('button[data-testid="LoginForm_Login_Button"]');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function getRandomElement(array) {
        const shuffledArray = shuffle([...array]);
        return shuffledArray[0];
    }

    for (const tweetUrl of tweetUrls) {
        const randomComment = getRandomElement(comments);
        const randomQuote = getRandomElement(quotes);
        console.log(tweetUrl)
        await page.goto(tweetUrl, { waitUntil: 'networkidle2' });

        const mainTweetContent = await page.evaluate(() => {
            const mainTweet = document.querySelector('article div[data-testid="tweetText"]');
            return mainTweet ? mainTweet.innerText : null;
        });

        if (mainTweetContent) {
            console.log(`Main tweet content: ${mainTweetContent}`);
        } else {
            console.log(`Main tweet not found for URL: ${tweetUrl}`);
            continue;
        }

        const { isLiked, likeButtonTestId } = await page.evaluate(() => {
            const likeButton = document.querySelector('article button[data-testid="Liked"], article button[data-testid="unlike"]');
            return {
                isLiked: likeButton && likeButton.getAttribute('data-testid') === 'unlike',
                likeButtonTestId: likeButton ? likeButton.getAttribute('data-testid') : null
            };
        });

        console.log(`Like button test ID: ${likeButtonTestId}`);
        console.log(`isLiked: ${isLiked}`);

        const { isRetweet, retweetButtonTestId } = await page.evaluate(() => {
            const retweetButton = document.querySelector('article button[data-testid="reposted"], article button[data-testid="unretweet"]');
            return {
                isRetweet: retweetButton && retweetButton.getAttribute('data-testid') === 'unretweet',
                retweetButtonTestId: retweetButton ? retweetButton.getAttribute('data-testid') : null
            };
        });

        console.log(`RT button test ID: ${retweetButtonTestId}`);
        console.log(`Retweeted?: ${isRetweet}`);

        if (isLiked && isRetweet) {
            console.log(`Main tweet already liked and retweeted: ${tweetUrl}. Skipping to next tweet.`);
            continue;
        }

        try {
            await page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 5000 });
            await page.type('div[data-testid="tweetTextarea_0"]', randomComment, { delay: 350 });
            await page.waitForSelector('button[data-testid="tweetButtonInline"]', { timeout: 5000 });
            await page.click('button[data-testid="tweetButtonInline"]');
            console.log(`Commented "${randomComment}" on tweet: ${tweetUrl}`);
            await new Promise(resolve => setTimeout(resolve, 3000)); 
            
        } catch (error) {
            console.log(`Error commenting on tweet: ${tweetUrl} - ${error.message}`);
        }

        try {
            await page.waitForSelector('button[data-testid="retweet"]', { timeout: 15000 });
            await page.click('button[data-testid="retweet"]');
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.waitForSelector('a[href="/compose/post"]', { timeout: 15000 });
            await page.click('a[href="/compose/post"]');
            await page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, 2000));
            await page.type('div[data-testid="tweetTextarea_0"]', randomQuote, { delay: 400 });
            await page.waitForSelector('button[data-testid="tweetButton"]', { timeout: 15000 });
            await page.click('button[data-testid="tweetButton"]');
            console.log(`Quoted tweet with comment: ${tweetUrl}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.log(`Error quoting tweet: ${tweetUrl} - ${error.message}`);
        }

        try {
            await page.waitForSelector('button[data-testid="like"]', { timeout: 10000 });
            await page.click('button[data-testid="like"]');
            console.log(`Liked tweet: ${tweetUrl}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.log(`Error liking tweet: ${tweetUrl} - ${error.message}`);
        }

        try {
            await page.waitForSelector('button[data-testid="retweet"]', { timeout: 15000 });
            await page.click('button[data-testid="retweet"]');
            await page.waitForSelector('div[role="menuitem"]', { timeout: 15000 });
            await new Promise(resolve => setTimeout(resolve, 5000));
            await page.click('div[role="menuitem"]');
            console.log(`Retweeted: ${tweetUrl}`);
        } catch (error) {
            console.log(`Error retweeting: ${tweetUrl} - ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, timeout));
    }

    await browser.close();
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
