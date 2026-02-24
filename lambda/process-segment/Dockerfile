FROM public.ecr.aws/lambda/nodejs:20

RUN dnf install -y tar xz && \
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz | \
    tar xJ --strip-components=1 -C /usr/local/bin/ --wildcards '*/ffmpeg' '*/ffprobe' && \
    dnf clean all

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.mjs ./

CMD ["index.handler"]
