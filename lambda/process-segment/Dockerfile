# Stage 1: Compile ffmpeg with dynamic linking (DNS support)
FROM public.ecr.aws/lambda/nodejs:20 AS builder

RUN dnf install -y \
    gcc gcc-c++ make \
    openssl-devel zlib-devel \
    tar xz \
    && dnf clean all

WORKDIR /build
RUN curl -L https://ffmpeg.org/releases/ffmpeg-7.1.1.tar.xz | tar xJ --strip-components=1

RUN ./configure \
    --prefix=/opt/ffmpeg \
    --enable-openssl \
    --enable-nonfree \
    --disable-doc \
    --disable-debug \
    --disable-ffplay \
    --disable-devices \
    --disable-postproc \
    && make -j$(nproc) \
    && make install

# Stage 2: Lambda runtime
FROM public.ecr.aws/lambda/nodejs:20

RUN dnf install -y openssl zlib && dnf clean all

COPY --from=builder /opt/ffmpeg/bin/ffmpeg /usr/local/bin/ffmpeg
COPY --from=builder /opt/ffmpeg/bin/ffprobe /usr/local/bin/ffprobe

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY index.mjs ./

CMD ["index.handler"]
